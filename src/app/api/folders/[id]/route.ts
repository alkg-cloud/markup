import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth/can-delete';
import { assertCascadeOwnershipForFolder, toCascadeViewer } from '@/lib/auth/cascade-check';
import { handleAuthError, identify } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdminFor } from '@/lib/auth/require-owner-or-admin';
import { prisma } from '@/lib/prisma';
import { deleteFolder, getFolder, updateFolder } from '@/lib/project/service';
import { urlSafeNameSchema } from '@/lib/validation/url-safe-name';

const patchSchema = z.object({
  name: urlSafeNameSchema().optional(),
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
  const ident = await identify(req);
  const { id } = await ctx.params;

  const gate = await requireOwnerOrAdminFor(ident, 'folder', id);
  if (gate instanceof NextResponse) return gate;

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message ?? 'invalid_body';
    return NextResponse.json({ error: code }, { status: 400 });
  }
  const result = await updateFolder(id, parsed.data);
  if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json(result.folder);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const ident = await identify(req);
  const { id } = await ctx.params;

  const gate = await requireOwnerOrAdminFor(ident, 'folder', id);
  if (gate instanceof NextResponse) return gate;
  const { viewer } = gate;

  // Atomic with the delete: closes the TOCTOU window where a concurrent
  // POST /api/mockups could insert a foreign-owned row between the
  // cascade-check and the delete. See docs/api/authz.md § Cascade.
  try {
    const deleted = await prisma.$transaction(async (tx) => {
      if (!isAdmin(viewer)) {
        await assertCascadeOwnershipForFolder(toCascadeViewer(viewer), id, tx);
      }
      return deleteFolder(id, tx);
    });
    if (!deleted) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ id: deleted.id });
  } catch (e) {
    return handleAuthError(e);
  }
}

export const dynamic = 'force-dynamic';
