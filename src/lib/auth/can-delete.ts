/**
 * Pure predicate that answers "can this viewer delete this entity?"
 *
 * Used in two places:
 *  1. `requireOwnerOrAdmin` (server) — throws 403 when this returns false.
 *  2. `useCanDelete` (React hook) — hides Delete buttons in the UI.
 *
 * See `docs/api/authz.md` for the full two-axis model.
 */

export type DeletableEntity =
  | { kind: 'project'; createdById: string | null }
  | { kind: 'folder'; createdById: string | null }
  | { kind: 'mockup'; createdById: string | null }
  | { kind: 'mockupVersion'; createdBy: string; createdByType: 'user' | 'agent' }
  | { kind: 'annotation'; createdBy: string; createdByType: 'user' | 'agent' }
  | { kind: 'message'; authorId: string; authorType: 'user' | 'agent' };

export type Viewer =
  | { kind: 'user'; userId: string; role: 'admin' | 'member' }
  | { kind: 'agent'; tokenId: string };

/**
 * Returns `true` when the viewer is permitted to delete the entity.
 *
 * Rules:
 * - Admin users can always delete.
 * - Agents can delete their own `Message` rows; nothing else.
 * - Members can delete user-authored entities they created.
 * - `null` `createdById` means "legacy row, no recorded owner" — members
 *   are forbidden; admins pass the admin branch above.
 * - Agent-authored content (mockupVersion/annotation with
 *   `createdByType === 'agent'`) is never deletable by members.
 */
export function canDelete(viewer: Viewer, entity: DeletableEntity): boolean {
  // Admin override — always allowed.
  if (viewer.kind === 'user' && viewer.role === 'admin') return true;

  // Message exception: agents can delete their own messages.
  if (entity.kind === 'message') {
    if (viewer.kind === 'user') {
      return entity.authorType === 'user' && entity.authorId === viewer.userId;
    }
    // agent viewer
    return entity.authorType === 'agent' && entity.authorId === viewer.tokenId;
  }

  // Agents cannot delete any other entity kind.
  if (viewer.kind !== 'user') return false;

  // Member checks — must be the recorded user-author.
  switch (entity.kind) {
    case 'project':
    case 'folder':
    case 'mockup':
      return entity.createdById !== null && entity.createdById === viewer.userId;

    case 'mockupVersion':
    case 'annotation':
      return entity.createdByType === 'user' && entity.createdBy === viewer.userId;
  }
}
