import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identify } from '@/lib/auth/identify';
import { prisma } from '@/lib/prisma';

const PayloadSchema = z.object({
  emoji: z.string().min(1).max(16),
});

/**
 * POST /api/messages/[id]/reactions
 *
 * Idempotent reaction toggle. Body: { emoji: string }.
 *
 * If (messageId, userId, emoji) already exists → delete.
 * Otherwise → create.
 *
 * Returns the post-mutation reactions for the message:
 * `{ reactions: { [emoji]: string[] } }`
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §10.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = ident.kind === 'user' ? ident.userId : ident.tokenId;

  const { id: messageId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { emoji } = parsed.data;

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const existing = await prisma.reaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({
      data: { messageId, userId, emoji },
    });
  }

  // Return the full updated reaction map for this message.
  const all = await prisma.reaction.findMany({
    where: { messageId },
    select: { emoji: true, userId: true },
    orderBy: { createdAt: 'asc' },
  });
  const grouped: Record<string, string[]> = {};
  for (const r of all) {
    if (!grouped[r.emoji]) grouped[r.emoji] = [];
    grouped[r.emoji].push(r.userId);
  }

  return NextResponse.json({ reactions: grouped });
}

export const dynamic = 'force-dynamic';
