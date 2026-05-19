import type { ReadonlyURLSearchParamsLike, TreeFolder, TreeProject } from './treeTypes';

/* ── Active-path resolution ───────────────────────────────────────────────
 *
 * Walks the tree by the current URL to compute which node ids should be
 * expanded so the active row is visible without the user clicking each
 * ancestor chevron. Path-based routes (`/projects/<slug>/<seg>/<seg>`)
 * are the primary input; the legacy `?project=&folder=` query string is
 * still honoured for leftover links.
 */

export function findFolderAncestorIds(project: TreeProject, folderId: string): string[] {
  function walk(folders: TreeFolder[], acc: string[]): string[] | null {
    for (const f of folders) {
      if (f.id === folderId) return acc;
      const sub = walk(f.children, [...acc, f.id]);
      if (sub) return sub;
    }
    return null;
  }
  return walk(project.folders, []) ?? [];
}

export function computeActivePathExpanded(
  projects: TreeProject[],
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParamsLike | null,
): Set<string> {
  const ids = new Set<string>();

  // Path-based routes: /projects/<slug>/<segment>/<segment>/.../<segment>
  // Walk the tree by name; each segment can be either a folder or the
  // trailing mockup slug. We expand every folder ancestor we visit.
  const pathMatch = pathname.match(/^\/projects\/([^/]+)(?:\/(.+))?$/);
  if (pathMatch) {
    const slug = decodeURIComponent(pathMatch[1]);
    const project = projects.find((p) => p.slug === slug);
    if (project) {
      ids.add(project.id);
      if (pathMatch[2]) {
        const segments = pathMatch[2].split('/').map(decodeURIComponent).filter(Boolean);
        let folders = project.folders;
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const folder = folders.find((f) => f.name === seg);
          if (!folder) break; // trailing segment was the mockup slug
          ids.add(folder.id);
          folders = folder.children;
        }
      }
    }
  }

  // Legacy query-string fallback — still useful for any leftover links
  // that pre-date the path-based routes.
  const projectSlug = searchParams?.get('project') ?? null;
  const folderId = searchParams?.get('folder') ?? null;
  if (projectSlug) {
    const project = projects.find((p) => p.slug === projectSlug);
    if (project) {
      ids.add(project.id);
      if (folderId) {
        for (const id of findFolderAncestorIds(project, folderId)) ids.add(id);
      }
    }
  }

  return ids;
}

/* ── Subtree/depth probes for DnD ────────────────────────────────────────
 *
 * DnD needs to know whether a drop would create a cycle (`getDescendantIds`)
 * and whether it would breach `MAX_FOLDER_DEPTH` (`getNodeDepth` + the
 * subtree's own height). The probes recurse into the tree by id.
 */

export function getDescendantIds(projects: TreeProject[], folderId: string): Set<string> {
  const ids = new Set<string>();
  function walk(folders: TreeFolder[]) {
    for (const f of folders) {
      if (f.id === folderId) {
        collectAll(f.children, ids);
        return true;
      }
      if (walk(f.children)) return true;
    }
    return false;
  }
  function collectAll(folders: TreeFolder[], acc: Set<string>) {
    for (const f of folders) {
      acc.add(f.id);
      collectAll(f.children, acc);
    }
  }
  for (const p of projects) walk(p.folders);
  return ids;
}

export function getNodeDepth(projects: TreeProject[], nodeId: string): number {
  function walk(folders: TreeFolder[], depth: number): number {
    for (const f of folders) {
      if (f.id === nodeId) return depth;
      const found = walk(f.children, depth + 1);
      if (found >= 0) return found;
    }
    return -1;
  }
  for (const p of projects) {
    const d = walk(p.folders, 1);
    if (d >= 0) return d;
  }
  return 0;
}

export function getSubtreeDepth(projects: TreeProject[], nodeId: string): number {
  function findFolder(folders: TreeFolder[]): TreeFolder | null {
    for (const f of folders) {
      if (f.id === nodeId) return f;
      const found = findFolder(f.children);
      if (found) return found;
    }
    return null;
  }
  function maxDepthBelow(folder: TreeFolder): number {
    if (folder.children.length === 0) return 0;
    return Math.max(...folder.children.map((c) => 1 + maxDepthBelow(c)));
  }
  for (const p of projects) {
    const f = findFolder(p.folders);
    if (f) return maxDepthBelow(f);
  }
  return 0;
}
