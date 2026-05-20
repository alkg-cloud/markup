import { NextResponse } from 'next/server';
import { handleAuthError, identify, requireAdmin } from '@/lib/auth/identify';
import { effectiveStatus } from '@/lib/auth/invite-token';
import { assertSameOrigin } from '@/lib/auth/origin';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  try {
    await requireAdmin(await identify(req));
  } catch (e) {
    return handleAuthError(e);
  }
  const { id } = await ctx.params;
  const invite = await prisma.invite.findUnique({ where: { id } });
  if (!invite) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const eff = effectiveStatus(invite);
  if (eff === 'unused') {
    await prisma.invite.update({
      where: { id },
      data: { status: 'revoked', revokedAt: new Date() },
    });
    return NextResponse.json({ id, action: 'revoked' });
  }
  await prisma.invite.delete({ where: { id } });
  return NextResponse.json({ id, action: 'deleted' });
}

export const dynamic = 'force-dynamic';
