'use client';

import { canDelete, type DeletableEntity } from '@/lib/auth/can-delete';
import { useIdentity } from './use-require-auth';

/**
 * Returns `true` when the currently-logged-in user is allowed to delete
 * the given entity.
 *
 * Uses the identity context populated by `AppShell` via `useRequireAuth()`.
 * Returns `false` while the identity is unresolved (shell loading) — the
 * Delete button stays hidden until auth resolves.
 *
 * Both the API and the UI use the same `canDelete` predicate so the two
 * layers cannot drift.
 *
 * See `docs/api/authz.md` for the full permission matrix.
 */
export function useCanDelete(entity: DeletableEntity | null): boolean {
  const ident = useIdentity();
  if (!ident || !entity) return false;
  if (ident.kind !== 'user') {
    // Agents can delete their own messages via the server-side check; the
    // UI doesn't render a kebab for agent-authored messages, so this is
    // belt-and-braces only.
    if (entity.kind === 'message') {
      return entity.authorType === 'agent' && ident.id != null && entity.authorId === ident.id;
    }
    return false;
  }
  const role = ident.role ?? 'member';
  return canDelete({ kind: 'user', userId: ident.id!, role }, entity);
}
