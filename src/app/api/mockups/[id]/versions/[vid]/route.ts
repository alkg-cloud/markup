import { NextResponse } from 'next/server';
import { handleAuthError, identify } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdmin } from '@/lib/auth/require-owner-or-admin';
import { deleteVersion } from '@/lib/mockup/version-service';
import { prisma } from '@/lib/prisma';

// See docs/api/authz.md for the full DELETE permission matrix.

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const ident = await identify(req);
  const { id, vid } = await ctx.params;

  const version = await prisma.mockupVersion.findUnique({
    where: { id: vid },
    select: { id: true, mockupId: true, createdBy: true, createdByType: true },
  });
  if (!version || version.mockupId !== id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    await requireOwnerOrAdmin(ident, {
      kind: 'mockupVersion',
      createdBy: version.createdBy,
      createdByType: version.createdByType as 'user' | 'agent',
    });
  } catch (e) {
    return handleAuthError(e);
  }

  try {
    await deleteVersion(id, vid);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleAuthError(e);
  }
}

export const dynamic = 'force-dynamic';
