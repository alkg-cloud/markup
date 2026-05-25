import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertCascadeOwnershipForProject } from '@/lib/auth/cascade-check';
import { handleAuthError, identify } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdmin } from '@/lib/auth/require-owner-or-admin';
import { prisma } from '@/lib/prisma';
import { deleteProject, getProject, updateProject } from '@/lib/project/service';
import { urlSafeNameSchema } from '@/lib/validation/url-safe-name';

const patchSchema = z.object({
  name: urlSafeNameSchema().optional(),
  icon: z.string().max(100).nullable().optional(),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const ident = await identify(req);
  const { id } = await ctx.params;

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, createdBy: true, createdByType: true },
  });
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    await requireOwnerOrAdmin(ident, {
      kind: 'project',
      createdBy: project.createdBy,
      createdByType: project.createdByType as 'user' | 'agent' | null,
    });
  } catch (e) {
    return handleAuthError(e);
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message ?? 'invalid_body';
    return NextResponse.json({ error: code }, { status: 400 });
  }
  const updated = await updateProject(id, parsed.data);
  if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const ident = await identify(req);
  const { id } = await ctx.params;

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, createdBy: true, createdByType: true },
  });
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let viewer: Awaited<ReturnType<typeof requireOwnerOrAdmin>>;
  try {
    viewer = await requireOwnerOrAdmin(ident, {
      kind: 'project',
      createdBy: project.createdBy,
      createdByType: project.createdByType as 'user' | 'agent' | null,
    });
  } catch (e) {
    return handleAuthError(e);
  }

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      // Skip cascade-check for admins (admin override).
      if (!(viewer.kind === 'user' && viewer.role === 'admin')) {
        await assertCascadeOwnershipForProject(
          {
            id: viewer.kind === 'user' ? viewer.userId : viewer.tokenId,
            type: viewer.kind,
          },
          id,
          tx,
        );
      }
      return deleteProject(id, tx);
    });
    if (!deleted) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ id: deleted.id });
  } catch (e) {
    return handleAuthError(e);
  }
}

export const dynamic = 'force-dynamic';
