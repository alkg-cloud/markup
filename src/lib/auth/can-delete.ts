/**
 * Pure predicate that answers "can this viewer delete this entity?"
 *
 * Used in two places:
 *  1. `requireOwnerOrAdmin` (server) — throws 403 when this returns false.
 *  2. `useCanDelete` (React hook) — hides Delete buttons in the UI.
 *
 * See `docs/api/authz.md` for the full ownership model.
 */

export type DeletableEntity =
  | { kind: 'project';       createdBy: string | null; createdByType: 'user' | 'agent' | null }
  | { kind: 'folder';        createdBy: string | null; createdByType: 'user' | 'agent' | null }
  | { kind: 'mockup';        createdBy: string | null; createdByType: 'user' | 'agent' | null }
  | { kind: 'mockupVersion'; createdBy: string;        createdByType: 'user' | 'agent' }
  | { kind: 'annotation';    createdBy: string;        createdByType: 'user' | 'agent' }
  | { kind: 'message';       authorId: string;         authorType: 'user' | 'agent' };

export type Viewer =
  | { kind: 'user'; userId: string; role: 'admin' | 'member' }
  | { kind: 'agent'; tokenId: string };

function viewerId(v: Viewer): string {
  return v.kind === 'user' ? v.userId : v.tokenId;
}

export function canDelete(viewer: Viewer, entity: DeletableEntity): boolean {
  if (viewer.kind === 'user' && viewer.role === 'admin') return true;

  if (entity.kind === 'message') {
    return viewer.kind === entity.authorType && viewerId(viewer) === entity.authorId;
  }

  if (entity.createdBy === null) return false; // legacy / anonymous → admin-only
  return viewer.kind === entity.createdByType && viewerId(viewer) === entity.createdBy;
}
