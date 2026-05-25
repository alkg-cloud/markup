import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAuthError, identify } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdmin } from '@/lib/auth/require-owner-or-admin';
import { prisma } from '@/lib/prisma';
import { moveFolder } from '@/lib/project/service';

const moveSchema = z.object({
  parentId: z.string().min(1).nullable(),
  position: z.number().int().min(0),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
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

  const parsed = moveSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const result = await moveFolder({ folderId: id, ...parsed.data });
  if ('error' in result) {
    const code = result.error;
    const is404 = code === 'not_found' || code === 'parent_not_found';
    return NextResponse.json({ error: code }, { status: is404 ? 404 : 409 });
  }
  return NextResponse.json(result.folder);
}

export const dynamic = 'force-dynamic';
