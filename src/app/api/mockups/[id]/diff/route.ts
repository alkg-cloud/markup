import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { renderUnifiedDiff } from '@/lib/diff/render-unified';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';

const TEXT_EXTS = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.md']);

function listFiles(dir: string, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (fs.statSync(full).isDirectory()) {
      for (const [k, v] of listFiles(full, rel)) out.set(k, v);
    } else {
      out.set(rel, full);
    }
  }
  return out;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id: mockupId } = await ctx.params;

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const format = url.searchParams.get('format') ?? 'unified';
  if (!from || !to) {
    return NextResponse.json({ error: 'missing_from_to' }, { status: 400 });
  }

  const [vFrom, vTo] = await Promise.all([
    prisma.mockupVersion.findFirst({ where: { id: from, mockupId } }),
    prisma.mockupVersion.findFirst({ where: { id: to, mockupId } }),
  ]);
  if (!vFrom || !vTo) {
    return NextResponse.json({ error: 'version_not_found' }, { status: 404 });
  }

  const root = env().DATA_DIR;
  const fromFiles = listFiles(path.join(root, vFrom.path));
  const toFiles = listFiles(path.join(root, vTo.path));
  const allNames = new Set([...fromFiles.keys(), ...toFiles.keys()]);

  const parts: string[] = [];
  for (const name of [...allNames].sort()) {
    const ext = path.extname(name).toLowerCase();
    const fromPath = fromFiles.get(name);
    const toPath = toFiles.get(name);
    if (!TEXT_EXTS.has(ext)) {
      const aBuf = fromPath ? fs.readFileSync(fromPath) : null;
      const bBuf = toPath ? fs.readFileSync(toPath) : null;
      const changed = (aBuf && !bBuf) || (!aBuf && bBuf) || (aBuf && bBuf && !aBuf.equals(bBuf));
      if (changed) parts.push(`Binary files ${name} differ`);
      continue;
    }
    const aText = fromPath ? fs.readFileSync(fromPath, 'utf8') : '';
    const bText = toPath ? fs.readFileSync(toPath, 'utf8') : '';
    const d = renderUnifiedDiff(
      aText,
      `${name} (${vFrom.id.slice(0, 8)})`,
      bText,
      `${name} (${vTo.id.slice(0, 8)})`,
    );
    if (d) parts.push(d);
  }
  const body = parts.join('\n');
  if (format === 'json') {
    return NextResponse.json({ diff: body, from: vFrom.id, to: vTo.id });
  }
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export const dynamic = 'force-dynamic';
