import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getAnnotation } from '@/lib/annotation/service';
import { identify } from '@/lib/auth/identify';
import { resolveDisplayName, resolveDisplayNames } from '@/lib/auth/resolve-display-name';
import { env } from '@/lib/env';
import { pathForMockup } from '@/lib/mockup/url';
import { prisma } from '@/lib/prisma';

// Aggregator for `/annotations/[id]` — returns the annotation + its
// thread + resolved display names + the screenshot dimensions read from
// the PNG header + the mockup name and canonical viewer href. The
// client page renders this directly; nothing here is recomputed on the
// client.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id: annotationId } = await ctx.params;
  const annotation = await getAnnotation(annotationId);
  if (!annotation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const messages = annotation.thread?.messages ?? [];
  const [authorInfo, mockup, authorNamesMap] = await Promise.all([
    resolveDisplayName(annotation.createdBy, annotation.createdByType),
    prisma.mockup.findUnique({
      where: { id: annotation.mockupId },
      select: { name: true },
    }),
    resolveDisplayNames(
      messages.map((m) => ({ createdBy: m.authorId, createdByType: m.authorType })),
    ),
  ]);

  const authorNamesById: Record<string, string> = {};
  for (const [authorId, dn] of authorNamesMap.entries()) {
    authorNamesById[authorId] = dn.name;
  }

  const mockupName = mockup?.name ?? annotation.mockupId;
  const viewerHref = (await pathForMockup(annotation.mockupId)) ?? '/';

  // Screenshot dimensions come straight from disk — the client can't
  // read DATA_DIR. Missing / corrupt PNGs fall back to width/height 0;
  // the page renders a placeholder in that case.
  let width = 0;
  let height = 0;
  try {
    const screenshotAbs = path.join(env().DATA_DIR, annotation.screenshotPath);
    const buf = fs.readFileSync(screenshotAbs);
    width = buf.readUInt32BE(16);
    height = buf.readUInt32BE(20);
  } catch {}

  return NextResponse.json({
    annotation: {
      id: annotation.id,
      createdAt: annotation.createdAt.toISOString(),
      createdBy: annotation.createdBy,
      createdByType: annotation.createdByType,
    },
    author: { name: authorInfo.name, kind: authorInfo.kind },
    thread: {
      id: annotation.thread?.id ?? null,
      status: annotation.thread?.status ?? 'open',
      messages: messages.map((m) => ({
        id: m.id,
        authorType: m.authorType,
        authorId: m.authorId,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    },
    authorNamesById,
    mockup: { name: mockupName, viewerHref },
    screenshot: { url: `/api/annotations/${annotation.id}/screenshot`, width, height },
  });
}

export const dynamic = 'force-dynamic';
