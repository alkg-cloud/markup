import { NextResponse } from 'next/server';
import { identify, requireAdmin } from '@/lib/auth/identify';
import { prisma } from '@/lib/prisma';

interface ErrorWithStatus extends Error {
  status?: number;
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(await identify(req));
  } catch (e) {
    const err = e as ErrorWithStatus;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
  const { id } = await ctx.params;
  await prisma.agentToken.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';
