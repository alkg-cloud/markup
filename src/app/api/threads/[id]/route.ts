import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { getThread } from '@/lib/thread/service';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const thread = await getThread(id);
  if (!thread) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(thread);
}

export const dynamic = 'force-dynamic';
