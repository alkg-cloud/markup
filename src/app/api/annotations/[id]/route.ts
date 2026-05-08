import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { parsePinCoords } from '@/lib/annotation/pin-coords';
import { getAnnotation } from '@/lib/annotation/service';
import { identify } from '@/lib/auth/identify';
import { env } from '@/lib/env';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const annotation = await getAnnotation(id);
  if (!annotation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let tldraw: unknown = null;
  try {
    const tldrawAbs = path.join(env().DATA_DIR, annotation.tldrawPath);
    tldraw = JSON.parse(fs.readFileSync(tldrawAbs, 'utf8'));
  } catch {
    // missing tldraw is non-fatal
  }
  return NextResponse.json({
    id: annotation.id,
    mockupId: annotation.mockupId,
    createdAt: annotation.createdAt,
    createdBy: annotation.createdBy,
    createdByType: annotation.createdByType,
    screenshotUrl: `/api/annotations/${annotation.id}/screenshot`,
    tldraw,
    pinCoords: parsePinCoords(annotation.pinCoords),
    thread: annotation.thread
      ? {
          id: annotation.thread.id,
          status: annotation.thread.status,
          messages: annotation.thread.messages.map((m) => ({
            id: m.id,
            authorType: m.authorType,
            authorId: m.authorId,
            body: m.body,
            createdAt: m.createdAt,
          })),
        }
      : null,
  });
}

export const dynamic = 'force-dynamic';
