import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { getProjectTree } from '@/lib/project/service';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const tree = await getProjectTree(id);
  if (!tree) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(tree);
}

export const dynamic = 'force-dynamic';
