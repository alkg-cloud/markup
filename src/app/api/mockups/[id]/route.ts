import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAuthError, identify } from '@/lib/auth/identify';
import { assertSameOrigin } from '@/lib/auth/origin';
import { requireOwnerOrAdmin } from '@/lib/auth/require-owner-or-admin';
import { logger } from '@/lib/logger';
import { deleteMockup, getMockup, renameMockup, setMockupStatus } from '@/lib/mockup/service';
import { prisma } from '@/lib/prisma';
import { urlSafeNameSchema } from '@/lib/validation/url-safe-name';

// See docs/api/authz.md for the full DELETE permission matrix.
// See docs/agent-loop/endpoints.md § PATCH /api/mockups/[id] for the agent-loop contract.

/**
 * PATCH /api/mockups/[id] — mutate mockup metadata.
 *
 * Agent-loop surface. Auth: cookie OR Bearer.
 * Whole request is gated by owner-or-admin against the mockup's
 * `(createdBy, createdByType)` ownership pair.
 */
const patchSchema = z
  .object({
    status: z.enum(['open', 'resolved', 'archived']).optional(),
    name: urlSafeNameSchema().optional(),
    projectId: z.string().min(1).nullable().optional(),
    folderId: z.string().min(1).nullable().optional(),
    position: z.number().int().min(0).optional(),
  })
  .strict();

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

  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id: mockupId } = await ctx.params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message ?? 'invalid_body';
    return NextResponse.json({ error: code }, { status: 400 });
  }

  const fields = parsed.data;
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 });
  }

  // Gate the whole request by owner-or-admin against the mockup's ownership pair.
  const existingRow = await prisma.mockup.findUnique({
    where: { id: mockupId },
    select: { id: true, createdBy: true, createdByType: true },
  });
  if (!existingRow) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    await requireOwnerOrAdmin(ident, {
      kind: 'mockup',
      createdBy: existingRow.createdBy,
      createdByType: existingRow.createdByType as 'user' | 'agent' | null,
    });
  } catch (e) {
    return handleAuthError(e);
  }

  // Existing mockup + FK targets run in parallel — none depend on each other.
  const [existing, project, folder] = await Promise.all([
    getMockup(mockupId),
    typeof fields.projectId === 'string'
      ? prisma.project.findUnique({ where: { id: fields.projectId } })
      : Promise.resolve(null),
    typeof fields.folderId === 'string'
      ? prisma.folder.findUnique({ where: { id: fields.folderId } })
      : Promise.resolve(null),
  ]);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (typeof fields.projectId === 'string' && !project) {
    return NextResponse.json({ error: 'project_not_found' }, { status: 400 });
  }
  if (typeof fields.folderId === 'string') {
    if (!folder) return NextResponse.json({ error: 'folder_not_found' }, { status: 400 });
    const resolvedProjectId = fields.projectId ?? existing.projectId;
    if (resolvedProjectId && folder.projectId !== resolvedProjectId) {
      return NextResponse.json({ error: 'folder_project_mismatch' }, { status: 400 });
    }
  }

  // Apply mutations in stable order: rename → status → placement.
  if (fields.name !== undefined) {
    await renameMockup(mockupId, fields.name);
  }
  if (fields.status !== undefined) {
    await setMockupStatus(mockupId, fields.status);
  }
  if (
    fields.projectId !== undefined ||
    fields.folderId !== undefined ||
    fields.position !== undefined
  ) {
    await prisma.mockup.update({
      where: { id: mockupId },
      data: {
        ...(fields.projectId !== undefined ? { projectId: fields.projectId } : {}),
        ...(fields.folderId !== undefined ? { folderId: fields.folderId } : {}),
        ...(fields.position !== undefined ? { position: fields.position } : {}),
      },
    });
  }

  logger.info(
    {
      event: 'mockup_patched',
      mockupId,
      fields: Object.keys(fields),
      identityKind: ident.kind,
    },
    'mockup patched',
  );

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
 * Auth: admin OR the identity that created the mockup
 *       (`Mockup.createdBy` + `Mockup.createdByType`). Agents own the
 *       mockups they created; users own theirs.
 *       Legacy rows (createdBy = NULL) are admin-only-deletable.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const ident = await identify(req);
  const { id: mockupId } = await ctx.params;

  const mockup = await prisma.mockup.findUnique({
    where: { id: mockupId },
    select: { id: true, createdBy: true, createdByType: true },
  });
  if (!mockup) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    await requireOwnerOrAdmin(ident, {
      kind: 'mockup',
      createdBy: mockup.createdBy,
      createdByType: mockup.createdByType as 'user' | 'agent' | null,
    });
  } catch (e) {
    return handleAuthError(e);
  }

  const deleted = await deleteMockup(mockupId);
  if (!deleted) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ id: deleted.id });
}

export const dynamic = 'force-dynamic';
