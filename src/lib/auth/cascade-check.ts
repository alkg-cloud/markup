import 'server-only';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { type Viewer, viewerId } from './can-delete';

type Db = Prisma.TransactionClient | typeof prisma;

interface ErrorWithStatus extends Error {
  status: number;
}

function http(status: number, message: string): never {
  const err = new Error(message) as ErrorWithStatus;
  err.status = status;
  throw err;
}

export interface CascadeViewer {
  id: string;
  type: 'user' | 'agent';
}

export function toCascadeViewer(viewer: Viewer): CascadeViewer {
  return { id: viewerId(viewer), type: viewer.kind };
}

function notOwned(viewer: CascadeViewer) {
  // A row is "foreign" if its (createdBy, createdByType) pair does not
  // match the viewer's identity — OR if createdBy is null (legacy).
  return {
    OR: [
      { createdBy: null },
      { createdByType: null },
      { NOT: { AND: [{ createdBy: viewer.id }, { createdByType: viewer.type }] } },
    ],
  };
}

/**
 * Throws `409 cascade_blocked_by_other_owner` when the project contains
 * any folder or mockup owned by another identity (cross-kind ownership
 * blocks the same way as cross-user). Admins skip this check entirely.
 *
 * See `docs/api/authz.md` for the full cascade rule.
 */
export async function assertCascadeOwnershipForProject(
  viewer: CascadeViewer,
  projectId: string,
  db: Db = prisma,
): Promise<void> {
  const foreign = notOwned(viewer);
  const [foreignMockupCount, foreignFolderCount] = await Promise.all([
    db.mockup.count({ where: { projectId, ...foreign } }),
    db.folder.count({ where: { projectId, ...foreign } }),
  ]);
  if (foreignMockupCount > 0 || foreignFolderCount > 0) {
    http(409, 'cascade_blocked_by_other_owner');
  }
}

/**
 * Throws `409 cascade_blocked_by_other_owner` when the folder subtree
 * contains any mockup or sub-folder owned by another identity.
 */
export async function assertCascadeOwnershipForFolder(
  viewer: CascadeViewer,
  folderId: string,
  db: Db = prisma,
): Promise<void> {
  const subtreeIds = new Set<string>();
  const queue: string[] = [folderId];
  while (queue.length > 0) {
    const batch = queue.splice(0, queue.length);
    for (const id of batch) subtreeIds.add(id);
    const children = await db.folder.findMany({
      where: { parentId: { in: batch } },
      select: { id: true },
    });
    for (const c of children) if (!subtreeIds.has(c.id)) queue.push(c.id);
  }

  const subtreeIdList = Array.from(subtreeIds);
  const subFolderIds = subtreeIdList.filter((id) => id !== folderId);
  const foreign = notOwned(viewer);

  const [foreignMockupCount, foreignFolderCount] = await Promise.all([
    db.mockup.count({ where: { folderId: { in: subtreeIdList }, ...foreign } }),
    db.folder.count({ where: { id: { in: subFolderIds }, ...foreign } }),
  ]);
  if (foreignMockupCount > 0 || foreignFolderCount > 0) {
    http(409, 'cascade_blocked_by_other_owner');
  }
}
