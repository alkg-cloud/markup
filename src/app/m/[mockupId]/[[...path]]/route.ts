import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { buildMockupCSP } from '@/lib/csp';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { resolveServePath, versionBuildDir } from '@/lib/mockup/storage';
import { prisma } from '@/lib/prisma';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ mockupId: string; path?: string[] }> },
) {
  const ident = await identify(req);
  if (!ident) {
    logger.warn({ event: 'mockup_serve_unauthorized', path: new URL(req.url).pathname }, 'unauth');
    return new NextResponse('unauthorized', { status: 401 });
  }
  const { mockupId: mockupIdOrSlug, path: rawSegments } = await ctx.params;
  const segments = rawSegments ?? ['index.html'];
  const url = new URL(req.url);
  const requestedVid = url.searchParams.get('v');
  const mockup = await prisma.mockup.findFirst({
    where: /^c[a-z0-9]{24}$/.test(mockupIdOrSlug)
      ? { id: mockupIdOrSlug }
      : { slug: mockupIdOrSlug },
    include: { versions: { select: { id: true } } },
  });
  if (!mockup?.currentVersionId) {
    return new NextResponse('not found', { status: 404 });
  }

  let serveVid = mockup.currentVersionId;
  if (requestedVid) {
    if (!mockup.versions.some((v) => v.id === requestedVid)) {
      return new NextResponse('version not found', { status: 404 });
    }
    serveVid = requestedVid;
  }

  const buildDir = versionBuildDir(env().DATA_DIR, mockup.id, serveVid);
  let target: string;
  try {
    target = resolveServePath(buildDir, segments);
  } catch {
    return new NextResponse('bad path', { status: 400 });
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return new NextResponse('not found', { status: 404 });
  }
  const buf = fs.readFileSync(target);
  const ext = path.extname(target).toLowerCase();
  const headers = new Headers({
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': 'private, no-cache',
    'content-security-policy': buildMockupCSP(),
    'x-content-type-options': 'nosniff',
  });
  return new NextResponse(buf, { status: 200, headers });
}

export const dynamic = 'force-dynamic';
