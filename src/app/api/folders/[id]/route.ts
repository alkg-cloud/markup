import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertCascadeOwnershipForFolder } from '@/lib/auth/cascade-check';
import { handleAuthError, identify } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdmin } from '@/lib/auth/require-owner-or-admin';
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

  const folder = await prisma.folder.findUnique({
    where: { id },
    select: { id: true, createdBy: true, createdByType: true },
  });
  if (!folder) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    await requireOwnerOrAdmin(ident, {
      kind: 'folder',
      createdBy: folder.createdBy,
      createdByType: folder.createdByType as 'user' | 'agent' | null,
    });
  } catch (e) {
    return handleAuthError(e);
  }

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

  const folder = await prisma.folder.findUnique({
    where: { id },
    select: { id: true, createdBy: true, createdByType: true },
  });
  if (!folder) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let viewer: Awaited<ReturnType<typeof requireOwnerOrAdmin>>;
  try {
    viewer = await requireOwnerOrAdmin(ident, {
      kind: 'folder',
      createdBy: folder.createdBy,
      createdByType: folder.createdByType as 'user' | 'agent' | null,
    });
  } catch (e) {
    return handleAuthError(e);
  }

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      if (!(viewer.kind === 'user' && viewer.role === 'admin')) {
        await assertCascadeOwnershipForFolder(
          {
            id: viewer.kind === 'user' ? viewer.userId : viewer.tokenId,
            type: viewer.kind,
          },
          id,
          tx,
        );
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
