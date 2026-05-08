import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { setThreadStatus } from '@/lib/thread/service';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id: threadId } = await ctx.params;
  await setThreadStatus(threadId, 'resolved', {
    id: ident.kind === 'user' ? ident.userId : ident.tokenId,
    kind: ident.kind,
  });
  return NextResponse.json({ ok: true, status: 'resolved' });
}

export const dynamic = 'force-dynamic';
