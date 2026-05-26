import { NextResponse } from 'next/server';
import { handleAuthError, identify, requireAdmin } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { prisma } from '@/lib/prisma';

// Admin-only — agent tokens are org-level secrets. See docs/api/authz.md.

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  try {
    await requireAdmin(await identify(req));
  } catch (e) {
    return handleAuthError(e);
  }
  const { id: tokenId } = await ctx.params;

  // Atomic revoke: SetNull on the nullable-ownership tables, then drop
  // the token row. `MockupVersion.createdBy` and `Annotation.createdBy`
  // are non-nullable — the orphan cuid stays there after revoke (matches
  // the User-deletion path for `Message.authorId`). `canDelete` returns
  // false because the cuid doesn't match any live token; admin
  // override still works; `resolveDisplayName` falls back to a short cuid.
  // When a public DELETE /api/users/[id] route is added, it must run the
  // same updateMany block with createdByType = 'user'. See docs/api/authz.md.
  await prisma.$transaction([
    prisma.project.updateMany({
      where: { createdBy: tokenId, createdByType: 'agent' },
      data: { createdBy: null, createdByType: null },
    }),
    prisma.folder.updateMany({
      where: { createdBy: tokenId, createdByType: 'agent' },
      data: { createdBy: null, createdByType: null },
    }),
    prisma.mockup.updateMany({
      where: { createdBy: tokenId, createdByType: 'agent' },
      data: { createdBy: null, createdByType: null },
    }),
    prisma.agentToken.deleteMany({ where: { id: tokenId } }),
  ]);

  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';
