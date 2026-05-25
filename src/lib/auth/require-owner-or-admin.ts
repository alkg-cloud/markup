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
 * Resolves the caller's `Viewer` (loading `role` for users) and calls
 * `canDelete`. On failure throws `403 forbidden_owner`.
 *
 * Note: this helper no longer auto-throws `forbidden_kind` for agents —
 * agents pass on entities they created. `forbidden_kind` is now emitted
 * exclusively by `requireAdmin` on admin-only-by-design routes.
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
