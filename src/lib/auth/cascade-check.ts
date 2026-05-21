import 'server-only';

import { prisma } from '@/lib/prisma';

interface ErrorWithStatus extends Error {
  status: number;
}

function http(status: number, message: string): never {
  const err = new Error(message) as ErrorWithStatus;
  err.status = status;
  throw err;
}

/**
 * Verifies that a member-owned project contains only content they also
 * own. Throws `409 cascade_blocked_by_other_owner` if any mockup or
 * folder inside the project belongs to someone else (or has no recorded
 * owner — NULL rows are admin-only-deletable by convention).
 *
 * Admins skip this check — only called on the member branch.
 *
 * See `docs/api/authz.md` §4.3 and `docs/api/authz.md` §"Cascade
 * semantics" for the full rationale.
 */
export async function assertCascadeOwnershipForProject(
  viewerId: string,
  projectId: string,
): Promise<void> {
  const foreignMockupCount = await prisma.mockup.count({
    where: {
      projectId,
      OR: [{ createdById: { not: viewerId } }, { createdById: null }],
    },
  });
  if (foreignMockupCount > 0) http(409, 'cascade_blocked_by_other_owner');

  const foreignFolderCount = await prisma.folder.count({
    where: {
      projectId,
      OR: [{ createdById: { not: viewerId } }, { createdById: null }],
    },
  });
  if (foreignFolderCount > 0) http(409, 'cascade_blocked_by_other_owner');
}

/**
 * Verifies that a member-owned folder contains only content they also
 * own (recursively). Throws `409 cascade_blocked_by_other_owner` when
 * any mockup or sub-folder in the subtree belongs to someone else.
 *
 * Uses a transitive closure over `parentId` via repeated DB queries
 * (the tree is typically shallow; depth ≤ 5 per the `MAX_FOLDER_DEPTH`
 * constant). For very wide trees the count query is a single indexed
 * scan; the traversal overhead is folder-count-bounded not row-count-
 * bounded.
 */
export async function assertCascadeOwnershipForFolder(
  viewerId: string,
  folderId: string,
): Promise<void> {
  // Collect all folder IDs in the subtree (BFS).
  const subtreeIds = new Set<string>();
  const queue: string[] = [folderId];
  while (queue.length > 0) {
    const batch = queue.splice(0, queue.length);
    for (const id of batch) subtreeIds.add(id);
    const children = await prisma.folder.findMany({
      where: { parentId: { in: batch } },
      select: { id: true },
    });
    for (const c of children) {
      if (!subtreeIds.has(c.id)) queue.push(c.id);
    }
  }

  // Check mockups inside any folder in the subtree.
  const foreignMockupCount = await prisma.mockup.count({
    where: {
      folderId: { in: [...subtreeIds] },
      OR: [{ createdById: { not: viewerId } }, { createdById: null }],
    },
  });
  if (foreignMockupCount > 0) http(409, 'cascade_blocked_by_other_owner');

  // Check sub-folders that belong to someone else.
  const foreignFolderCount = await prisma.folder.count({
    where: {
      id: { in: [...subtreeIds].filter((id) => id !== folderId) },
      OR: [{ createdById: { not: viewerId } }, { createdById: null }],
    },
  });
  if (foreignFolderCount > 0) http(409, 'cascade_blocked_by_other_owner');
}
