import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertCascadeOwnershipForFolder } from '@/lib/auth/cascade-check';
import { handleAuthError, identify, requireAdmin } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdmin } from '@/lib/auth/require-owner-or-admin';
import { prisma } from '@/lib/prisma';
import { deleteFolder, getFolder, updateFolder } from '@/lib/project/service';
import { urlSafeNameSchema } from '@/lib/validation/url-safe-name';

// Admin-only routes point here for the authz reference.
// See docs/api/authz.md

const patchSchema = z.object({
  name: urlSafeNameSchema(255).optional(),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const folder = await getFolder(id);
  if (!folder) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(folder);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  try {
    await requireAdmin(await identify(req));
  } catch (e) {
    return handleAuthError(e);
  }
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const result = await updateFolder(id, parsed.data);
  if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json(result.folder);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const ident = await identify(req);
  const { id } = await ctx.params;

  const folder = await prisma.folder.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });
  if (!folder) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    const resolvedIdent = await requireOwnerOrAdmin(ident, {
      kind: 'folder',
      createdById: folder.createdById,
    });
    const isAdmin =
      resolvedIdent.kind === 'user' &&
      (
        await prisma.user.findUnique({
          where: { id: resolvedIdent.userId },
          select: { role: true },
        })
      )?.role === 'admin';
    if (!isAdmin && resolvedIdent.kind === 'user') {
      await assertCascadeOwnershipForFolder(resolvedIdent.userId, id);
    }
  } catch (e) {
    return handleAuthError(e);
  }

  const deleted = await deleteFolder(id);
  if (!deleted) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ id: deleted.id });
}

export const dynamic = 'force-dynamic';
