import { prisma } from '@/lib/prisma';

export interface FolderResolution {
  kind: 'folder';
  folderId: string;
  folderName: string;
  /** Full ancestor-to-self name list. */
  pathNames: string[];
}

export interface MockupResolution {
  kind: 'mockup';
  mockupId: string;
  mockupSlug: string;
  folderId: string | null;
  /** Ancestor folder names up to and including the parent of the mockup. */
  folderPathNames: string[];
}

export type PathResolution = FolderResolution | MockupResolution | null;

/**
 * Walk the project's folder tree by name, resolving a slash-separated
 * URL path to either a folder or a mockup. The last segment can be a
 * mockup slug — when the segment matches a mockup under the resolved
 * folder, the resolver returns the mockup; otherwise it must be a
 * folder name.
 *
 * Segments come pre-decoded (Next.js does URL decoding on dynamic
 * route params).
 */
export async function resolveProjectPath(
  projectId: string,
  segments: ReadonlyArray<string>,
): Promise<PathResolution> {
  if (segments.length === 0) return null;
  // Walk folders from project root downward.
  let parentId: string | null = null;
  const pathNames: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;
    // Try folder match first — folders with the same name as a mockup
    // slug under the same parent are vanishingly rare; folders win the
    // tie because they're container-like.
    const folder = await prisma.folder.findFirst({
      where: { projectId, parentId, name: segment },
      select: { id: true, name: true },
    });
    if (folder) {
      parentId = folder.id;
      pathNames.push(folder.name);
      if (isLast) {
        return { kind: 'folder', folderId: folder.id, folderName: folder.name, pathNames };
      }
      continue;
    }
    // Folder not found. If this is the last segment, check for a
    // mockup with that slug inside the current folder (parentId).
    if (isLast) {
      const mockup = await prisma.mockup.findFirst({
        where: { projectId, folderId: parentId, slug: segment },
        select: { id: true, slug: true, folderId: true },
      });
      if (mockup) {
        return {
          kind: 'mockup',
          mockupId: mockup.id,
          mockupSlug: mockup.slug,
          folderId: mockup.folderId,
          folderPathNames: pathNames,
        };
      }
    }
    // Neither folder nor mockup matched — path is invalid.
    return null;
  }
  return null;
}

/** Collect a folder's ancestor names (root → ...→ parent → self). */
export async function buildFolderNamePath(folderId: string): Promise<string[]> {
  const out: string[] = [];
  let current: string | null = folderId;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current)) break;
    seen.add(current);
    const f: { id: string; name: string; parentId: string | null } | null =
      await prisma.folder.findUnique({
        where: { id: current },
        select: { id: true, name: true, parentId: true },
      });
    if (!f) break;
    out.unshift(f.name);
    current = f.parentId;
  }
  return out;
}
