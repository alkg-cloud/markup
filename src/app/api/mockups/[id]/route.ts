import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAuthError, identify, requireAdmin } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdmin } from '@/lib/auth/require-owner-or-admin';
import { deleteMockup, getMockup, renameMockup, setMockupStatus } from '@/lib/mockup/service';
import { prisma } from '@/lib/prisma';
import { urlSafeNameSchema } from '@/lib/validation/url-safe-name';

// See docs/api/authz.md for the full DELETE permission matrix.

const patchSchema = z.object({
  name: urlSafeNameSchema(200).optional(),
  status: z.enum(['open', 'resolved', 'archived']).optional(),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await identify(req);
  if (!id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id: mockupId } = await ctx.params;
  const mockup = await getMockup(mockupId);
  if (!mockup) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(mockup);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  try {
    await requireAdmin(await identify(req));
  } catch (e) {
    return handleAuthError(e);
  }
  const { id: mockupId } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  if (parsed.data.status) {
    await setMockupStatus(mockupId, parsed.data.status);
  }
  if (parsed.data.name) {
    await renameMockup(mockupId, parsed.data.name);
  }
  const updated = await getMockup(mockupId);
  if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(updated);
}

/**
 * DELETE /api/mockups/[id]
 *
 * Deletes a mockup and all its version build directories from disk. Cascade
 * rules in Prisma handle annotations, threads, messages, and reactions.
 *
 * Auth: admin OR the user who created the mockup (`Mockup.createdById`).
 *       Agents are rejected with 403 `forbidden_kind` (docs/api/authz.md §4).
 *       Legacy rows (createdById = NULL) are admin-only-deletable.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const ident = await identify(req);
  const { id: mockupId } = await ctx.params;

  const mockup = await prisma.mockup.findUnique({
    where: { id: mockupId },
    select: { id: true, createdById: true },
  });
  if (!mockup) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    await requireOwnerOrAdmin(ident, { kind: 'mockup', createdById: mockup.createdById });
  } catch (e) {
    return handleAuthError(e);
  }

  const deleted = await deleteMockup(mockupId);
  if (!deleted) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ id: deleted.id });
}

export const dynamic = 'force-dynamic';
