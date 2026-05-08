import { NextResponse } from 'next/server';
import { identify } from '@/lib/auth/identify';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const id = await identify(req);
  if (!id) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (id.kind === 'user') {
    const user = await prisma.user.findUnique({ where: { id: id.userId } });
    return NextResponse.json({ kind: 'user', id: user?.id, email: user?.email, name: user?.name });
  }
  return NextResponse.json({ kind: 'agent', id: id.tokenId, name: id.name });
}

export const dynamic = 'force-dynamic';
