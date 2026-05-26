import 'server-only';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canDelete, type DeletableEntity, narrowCreatedByType, type Viewer } from './can-delete';
import type { Identity } from './identify';
import { handleAuthError, requireIdentity } from './identify';

interface ErrorWithStatus extends Error {
  status: number;
}

function http(status: number, message: string): never {
  const err = new Error(message) as ErrorWithStatus;
  err.status = status;
  throw err;
}

/**
 * Resolves the caller's `Viewer` (loading `role` for users) and calls
 * `canDelete`. On failure throws `403 forbidden_owner`.
 *
 * Throws `forbidden_owner` only. `forbidden_kind` is emitted exclusively
 * by `requireAdmin` on admin-only-by-design routes; this helper passes
 * agents through `canDelete` for entities they created.
 *
 * See `docs/api/authz.md` for the full model.
 */
export async function requireOwnerOrAdmin(
  ident: Identity | null,
  entity: DeletableEntity,
): Promise<Viewer> {
  requireIdentity(ident);

  let viewer: Viewer;
  if (ident.kind === 'agent') {
    viewer = { kind: 'agent', tokenId: ident.tokenId };
  } else {
    const user = await prisma.user.findUnique({
      where: { id: ident.userId },
      select: { role: true },
    });
    const role = (user?.role ?? 'member') as 'admin' | 'member';
    viewer = { kind: 'user', userId: ident.userId, role };
  }

  if (!canDelete(viewer, entity)) http(403, 'forbidden_owner');
  return viewer;
}

type OwnedKind = 'project' | 'folder' | 'mockup' | 'annotation';

const TABLE_BY_KIND: Record<OwnedKind, 'project' | 'folder' | 'mockup' | 'annotation'> = {
  project: 'project',
  folder: 'folder',
  mockup: 'mockup',
  annotation: 'annotation',
};

interface OwnedRow {
  id: string;
  createdBy: string | null;
  createdByType: 'user' | 'agent' | null;
}

/**
 * Loads the ownership pair on the given entity and gates with
 * `requireOwnerOrAdmin`. Returns `{ row, viewer }` on success or a
 * NextResponse on failure (404 not_found / 401 unauthorized / 403
 * forbidden_owner). Caller patterns:
 *
 *   const gate = await requireOwnerOrAdminFor(ident, 'project', id);
 *   if (gate instanceof NextResponse) return gate;
 *   const { viewer } = gate;
 */
export async function requireOwnerOrAdminFor(
  ident: Identity | null,
  kind: OwnedKind,
  id: string,
): Promise<{ viewer: Viewer; row: OwnedRow } | NextResponse> {
  const model = (
    prisma as unknown as Record<
      string,
      {
        findUnique: (args: unknown) => Promise<{
          id: string;
          createdBy: string | null;
          createdByType: string | null;
        } | null>;
      }
    >
  )[TABLE_BY_KIND[kind]];
  const found = await model.findUnique({
    where: { id },
    select: { id: true, createdBy: true, createdByType: true },
  });
  if (!found) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const row: OwnedRow = {
    id: found.id,
    createdBy: found.createdBy,
    createdByType: narrowCreatedByType(found.createdByType),
  };

  try {
    const viewer = await requireOwnerOrAdmin(ident, {
      kind: kind as 'project',
      createdBy: row.createdBy,
      createdByType: row.createdByType,
    } as Parameters<typeof requireOwnerOrAdmin>[1]);
    return { row, viewer };
  } catch (e) {
    return handleAuthError(e);
  }
}
