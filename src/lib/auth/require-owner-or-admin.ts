import 'server-only';

import { prisma } from '@/lib/prisma';
import { canDelete, type DeletableEntity, type Viewer } from './can-delete';
import type { Identity } from './identify';
import { requireIdentity } from './identify';

interface ErrorWithStatus extends Error {
  status: number;
}

function http(status: number, message: string): never {
  const err = new Error(message) as ErrorWithStatus;
  err.status = status;
  throw err;
}

/**
 * Server companion to `canDelete`. Fetches the caller's role, builds a
 * `Viewer`, and throws a typed HTTP error when the caller is not
 * permitted to delete the given entity.
 *
 * - 401 `unauthorized` — unauthenticated request.
 * - 403 `forbidden_kind` — agent tried to delete a non-message entity.
 * - 403 `forbidden_owner` — member tried to delete someone else's content.
 *
 * Returns the resolved `Viewer` (with role) on success so cascade-check
 * callers don't need to re-query the user's role.
 *
 * See `docs/api/authz.md` for the full permission matrix.
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

  if (!canDelete(viewer, entity)) {
    if (viewer.kind === 'agent') {
      http(403, 'forbidden_kind');
    }
    http(403, 'forbidden_owner');
  }

  return viewer;
}
