import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identify } from '@/lib/auth/identify';
import { appendMessage } from '@/lib/thread/service';

const bodySchema = z.object({ body: z.string().min(1).max(10000) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id: threadId } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const message = await appendMessage({
    threadId,
    body: parsed.data.body,
    authorId: ident.kind === 'user' ? ident.userId : ident.tokenId,
    authorType: ident.kind,
  });
  return NextResponse.json({ id: message.id, createdAt: message.createdAt }, { status: 201 });
}

export const dynamic = 'force-dynamic';
