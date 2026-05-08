import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await identify(req);
  if (!id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id: mockupId } = await ctx.params;
  const versions = await prisma.mockupVersion.findMany({
    where: { mockupId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ versions });
}

export const dynamic = 'force-dynamic';
