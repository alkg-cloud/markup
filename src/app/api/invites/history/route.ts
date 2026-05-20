import { NextResponse } from 'next/server';
import { handleAuthError, identify, requireAdmin } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  try {
    await requireAdmin(await identify(req));
  } catch (e) {
    return handleAuthError(e);
  }
  const now = new Date();
  const result = await prisma.invite.deleteMany({
    where: {
      OR: [
        { status: { in: ['used', 'revoked', 'disabled'] } },
        { status: 'unused', expiresAt: { lte: now } },
      ],
    },
  });
  return NextResponse.json({ deleted: result.count });
}

export const dynamic = 'force-dynamic';
