import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parsePinCoords } from '@/lib/annotation/pin-coords';
import { getAnnotation } from '@/lib/annotation/service';
import { ANNOTATION_STATUSES } from '@/lib/annotation/status';
import { identify } from '@/lib/auth/identify';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';

const PatchSchema = z.object({
  status: z.enum(ANNOTATION_STATUSES).optional(),
});

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

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const existing = await prisma.annotation.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const data: { status?: string } = {};
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 });
  }
  await prisma.annotation.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const existing = await prisma.annotation.findUnique({
    where: { id },
    include: { thread: true },
  });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  // Reactions → messages → thread → annotation. The schema doesn't have
  // ON DELETE CASCADE on every edge, so unwind in order.
  if (existing.thread) {
    const msgs = await prisma.message.findMany({
      where: { threadId: existing.thread.id },
      select: { id: true },
    });
    if (msgs.length > 0) {
      await prisma.reaction.deleteMany({ where: { messageId: { in: msgs.map((m) => m.id) } } });
      await prisma.message.deleteMany({ where: { threadId: existing.thread.id } });
    }
    await prisma.thread.delete({ where: { id: existing.thread.id } });
  }
  await prisma.annotation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';
