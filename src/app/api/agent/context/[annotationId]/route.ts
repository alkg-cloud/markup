import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { GET as getIntent } from '@/app/api/annotations/[id]/intent/route';
import { identify } from '@/lib/auth/identify';
import { resolveDisplayNames } from '@/lib/auth/resolve-display-name';
import { renderUnifiedDiff } from '@/lib/diff/render-unified';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';

const TEXT_EXTS = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.md']);

function listVersionFiles(buildDir: string): { text: Record<string, string>; binary: string[] } {
  const text: Record<string, string> = {};
  const binary: string[] = [];
  if (!fs.existsSync(buildDir)) return { text, binary };
  const walk = (dir: string, prefix = '') => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      if (fs.statSync(full).isDirectory()) walk(full, rel);
      else if (TEXT_EXTS.has(path.extname(rel).toLowerCase())) {
        text[rel] = fs.readFileSync(full, 'utf8');
      } else {
        binary.push(rel);
      }
    }
  };
  walk(buildDir);
  return { text, binary };
}

export async function GET(req: Request, ctx: { params: Promise<{ annotationId: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { annotationId } = await ctx.params;

  const annotation = await prisma.annotation.findUnique({
    where: { id: annotationId },
    include: { thread: { include: { messages: { orderBy: { createdAt: 'asc' } } } } },
  });
  if (!annotation) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const mockup = await prisma.mockup.findUnique({
    where: { id: annotation.mockupId },
    select: { currentVersionId: true },
  });
  if (!mockup?.currentVersionId) {
    return NextResponse.json({ error: 'no_current_version' }, { status: 404 });
  }

  const tldrawAbs = path.join(env().DATA_DIR, annotation.tldrawPath);
  const tldrawMtime = fs.existsSync(tldrawAbs) ? fs.statSync(tldrawAbs).mtimeMs : 0;
  const lastMessageId = annotation.thread?.messages.at(-1)?.id ?? '';
  const etag = `"${crypto
    .createHash('sha256')
    .update(`${tldrawMtime}:${mockup.currentVersionId}:${lastMessageId}`)
    .digest('hex')
    .slice(0, 16)}"`;
  if (req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  // Inline current_version files (text only); list binaries by name
  const versionDir = path.join(
    env().DATA_DIR,
    'mockups',
    annotation.mockupId,
    'versions',
    mockup.currentVersionId,
    'build',
  );
  const { text: files, binary: binary_files } = listVersionFiles(versionDir);

  // Diff since creation (only when versions differ)
  let diff_since_creation = '';
  if (annotation.createdOnVersionId && annotation.createdOnVersionId !== mockup.currentVersionId) {
    const createdDir = path.join(
      env().DATA_DIR,
      'mockups',
      annotation.mockupId,
      'versions',
      annotation.createdOnVersionId,
      'build',
    );
    const aIndex = path.join(createdDir, 'index.html');
    const bIndex = path.join(versionDir, 'index.html');
    if (fs.existsSync(aIndex) || fs.existsSync(bIndex)) {
      const a = fs.existsSync(aIndex) ? fs.readFileSync(aIndex, 'utf8') : '';
      const b = fs.existsSync(bIndex) ? fs.readFileSync(bIndex, 'utf8') : '';
      diff_since_creation = renderUnifiedDiff(
        a,
        `index.html (${annotation.createdOnVersionId.slice(0, 8)})`,
        b,
        `index.html (${mockup.currentVersionId.slice(0, 8)})`,
      );
    }
  }

  // Resolve message display names
  const messages = annotation.thread?.messages ?? [];
  const namesMap = await resolveDisplayNames(
    messages.map((m) => ({ createdBy: m.authorId, createdByType: m.authorType })),
  );

  // Delegate intent computation to the existing route handler
  let intent: unknown = null;
  try {
    const intentRes = await getIntent(req, {
      params: Promise.resolve({ id: annotation.id }),
    });
    if (intentRes.status === 200) {
      intent = await intentRes.json();
    }
  } catch {
    intent = null;
  }

  return NextResponse.json(
    {
      annotation: {
        id: annotation.id,
        mockup_id: annotation.mockupId,
        intent_type: annotation.intentType,
        pin_coords: annotation.pinCoords ? JSON.parse(annotation.pinCoords) : null,
        created_by: annotation.createdBy,
        created_by_type: annotation.createdByType,
        created_at: annotation.createdAt,
        created_on_version_id: annotation.createdOnVersionId,
      },
      intent,
      thread: {
        id: annotation.thread?.id ?? null,
        status: annotation.thread?.status ?? 'open',
        messages: messages.map((m) => ({
          id: m.id,
          author_type: m.authorType,
          author_id: m.authorId,
          author_display_name: namesMap.get(m.authorId)?.name ?? m.authorId,
          body: m.body,
          created_at: m.createdAt,
        })),
      },
      current_version: {
        id: mockup.currentVersionId,
        files,
        binary_files,
      },
      diff_since_creation,
    },
    { headers: { ETag: etag } },
  );
}

export const dynamic = 'force-dynamic';
