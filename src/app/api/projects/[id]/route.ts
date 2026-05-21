import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertCascadeOwnershipForProject } from '@/lib/auth/cascade-check';
import { handleAuthError, identify, requireAdmin } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdmin } from '@/lib/auth/require-owner-or-admin';
import { prisma } from '@/lib/prisma';
import { deleteProject, getProject, updateProject } from '@/lib/project/service';
import { urlSafeNameSchema } from '@/lib/validation/url-safe-name';

// Admin-only routes point here for the authz reference.
// See docs/api/authz.md

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
  try {
    await requireAdmin(await identify(req));
  } catch (e) {
    return handleAuthError(e);
  }
  const { id } = await ctx.params;
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

  // Load project first so we can pass the ownership field to requireOwnerOrAdmin.
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    const resolvedIdent = await requireOwnerOrAdmin(ident, {
      kind: 'project',
      createdById: project.createdById,
    });
    // Only members need the cascade check — admins may always cascade-delete.
    const isAdmin =
      resolvedIdent.kind === 'user' &&
      (
        await prisma.user.findUnique({
          where: { id: resolvedIdent.userId },
          select: { role: true },
        })
      )?.role === 'admin';
    if (!isAdmin && resolvedIdent.kind === 'user') {
      await assertCascadeOwnershipForProject(resolvedIdent.userId, id);
    }
  } catch (e) {
    return handleAuthError(e);
  }

  const deleted = await deleteProject(id);
  if (!deleted) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ id: deleted.id });
}

export const dynamic = 'force-dynamic';
