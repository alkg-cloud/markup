import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identify } from '@/lib/auth/identify';
import { prisma } from '@/lib/prisma';

const PatchSchema = z.object({
  body: z.string().min(1).max(4000),
});

/**
 * PATCH /api/messages/[id] — edit a comment's body.
 *
 * Only the original author can edit. Body: { body: string }.
 * Returns `{ id, body }`. Doesn't track an `editedAt` field today —
 * the redesign treats edits as silent body rewrites (per spec §9).
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §9.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const callerId = ident.kind === 'user' ? ident.userId : ident.tokenId;
  const callerType = ident.kind === 'user' ? 'user' : 'agent';

  const { id: messageId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (message.authorId !== callerId || message.authorType !== callerType) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { body: parsed.data.body },
    select: { id: true, body: true },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/messages/[id] — delete a comment.
 *
 * Only the original author can delete. The primary message (the
 * annotation body — first in thread by createdAt) cannot be deleted —
 * delete the annotation instead. Cascades delete reactions via the
 * Prisma `onDelete: Cascade` relation on `Reaction.messageId`.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §9.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const callerId = ident.kind === 'user' ? ident.userId : ident.tokenId;
  const callerType = ident.kind === 'user' ? 'user' : 'agent';

  const { id: messageId } = await ctx.params;
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (message.authorId !== callerId || message.authorType !== callerType) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const primary = await prisma.message.findFirst({
    where: { threadId: message.threadId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (primary?.id === messageId) {
    return NextResponse.json(
      { error: 'cannot_delete_primary', detail: 'Delete the annotation instead.' },
      { status: 400 },
    );
  }

  await prisma.message.delete({ where: { id: messageId } });
  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';
