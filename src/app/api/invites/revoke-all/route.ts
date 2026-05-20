import { NextResponse } from 'next/server';
import { handleAuthError, identify, requireAdmin } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  try {
    await requireAdmin(await identify(req));
  } catch (e) {
    return handleAuthError(e);
  }
  const now = new Date();
  const result = await prisma.invite.updateMany({
    where: {
      status: 'unused',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    data: { status: 'revoked', revokedAt: now },
  });
  return NextResponse.json({ revoked: result.count });
}

export const dynamic = 'force-dynamic';
