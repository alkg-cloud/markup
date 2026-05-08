import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identify } from '@/lib/auth/identify';
import { applyUnifiedDiff, DiffApplyError } from '@/lib/diff/apply-unified';
import { env } from '@/lib/env';
import { addVersionFromFiles } from '@/lib/mockup/service';
import { prisma } from '@/lib/prisma';

const TEXT_EXTS = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.md']);

const bodySchema = z.object({
  base_version_id: z.string().min(1),
  patches: z.record(z.string(), z.string()),
});

function listFiles(dir: string, prefix = ''): Record<string, Buffer> {
  const out: Record<string, Buffer> = {};
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      Object.assign(out, listFiles(full, rel));
    } else {
      out[rel] = fs.readFileSync(full);
    }
  }
  return out;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id: mockupId } = await ctx.params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const { base_version_id, patches } = parsed.data;

  const baseVersion = await prisma.mockupVersion.findFirst({
    where: { id: base_version_id, mockupId },
  });
  if (!baseVersion) {
    return NextResponse.json({ error: 'base_version_not_found' }, { status: 404 });
  }

  const baseDir = path.join(env().DATA_DIR, baseVersion.path);
  if (!fs.existsSync(baseDir)) {
    return NextResponse.json({ error: 'base_version_files_missing' }, { status: 404 });
  }

  // Reject patches targeting binary files
  for (const filename of Object.keys(patches)) {
    const ext = path.extname(filename).toLowerCase();
    if (!TEXT_EXTS.has(ext)) {
      return NextResponse.json(
        { error: 'binary_patch_unsupported', file: filename },
        { status: 415 },
      );
    }
  }

  const files = listFiles(baseDir);

  for (const [filename, patch] of Object.entries(patches)) {
    const orig = files[filename];
    if (!orig) {
      return NextResponse.json(
        { error: 'patch_target_not_found', file: filename },
        { status: 400 },
      );
    }
    try {
      const next = applyUnifiedDiff(orig.toString('utf8'), patch);
      files[filename] = Buffer.from(next, 'utf8');
    } catch (e) {
      if (e instanceof DiffApplyError) {
        const status = e.reason === 'conflict' ? 409 : 400;
        return NextResponse.json({ error: `patch_${e.reason}`, file: filename }, { status });
      }
      throw e;
    }
  }

  const version = await addVersionFromFiles({
    mockupId,
    files,
    createdBy: ident.kind === 'user' ? ident.userId : ident.tokenId,
    createdByType: ident.kind,
  });

  return NextResponse.json(
    { id: version.id, mockupId, createdAt: version.createdAt },
    { status: 201 },
  );
}

export const dynamic = 'force-dynamic';
