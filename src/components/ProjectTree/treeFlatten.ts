import { folderHref, mockupSlugHref, projectHref } from '@/lib/project/routes';
import type { FlatNode, TreeFolder, TreeMockup, TreeProject } from './treeTypes';

/* ── Flatten tree into a navigable list ───────────────────────────────────
 *
 * The render loop in `ProjectTree` is index-based (`role="tree"` with
 * arrow-key nav, DnD targets, focus management). Computing the flat list
 * from the recursive tree + expansion set keeps the render logic free of
 * recursion.
 */

export function flattenProjects(
  projects: TreeProject[],
  expandedSet: Set<string>,
  recents: Record<string, string[]>,
): FlatNode[] {
  const nodes: FlatNode[] = [];

  for (let pi = 0; pi < projects.length; pi++) {
    const p = projects[pi];
    const pExpanded = expandedSet.has(p.id);
    nodes.push({
      id: p.id,
      type: 'project',
      label: p.name,
      icon: p.icon,
      level: 1,
      expandable: true,
      expanded: pExpanded,
      parentId: null,
      href: projectHref(p.slug),
      setSize: projects.length,
      posInSet: pi + 1,
      projectSlug: p.slug,
      projectId: p.id,
      childCount: p.folders.length + p.mockups.length,
    });

    if (!pExpanded) continue;

    const recentMockupIds = recents[p.slug] ?? [];
    if (recentMockupIds.length > 0) {
      nodes.push({
        id: `recents-${p.id}`,
        type: 'recents-header',
        label: 'Recents',
        level: 2,
        expandable: false,
        expanded: false,
        parentId: p.id,
        href: '',
        setSize: 0,
        posInSet: 0,
        projectSlug: p.slug,
        projectId: p.id,
      });
      for (let ri = 0; ri < recentMockupIds.length; ri++) {
        // NOTE: dead code at the moment — `ProjectSidebar` doesn't pass
        // `recents` to ProjectTree so this branch never produces nodes.
        // RecentsSection handles the visible recents instead. When this
        // path is wired up, the caller will need to supply the canonical
        // path-based href (project slug + folder names + mockup slug);
        // we leave a placeholder pointing at `/` so a stray click doesn't
        // 404 if the dead path ever wakes up.
        nodes.push({
          id: `recent-${p.id}-${recentMockupIds[ri]}`,
          type: 'recents-item',
          label: recentMockupIds[ri],
          level: 3,
          expandable: false,
          expanded: false,
          parentId: `recents-${p.id}`,
          href: '/',
          setSize: recentMockupIds.length,
          posInSet: ri + 1,
          projectSlug: p.slug,
          projectId: p.id,
          mockupId: recentMockupIds[ri],
        });
      }
    }

    const allChildren = [...p.folders, ...p.mockups];
    flattenChildren(
      nodes,
      p.folders,
      p.mockups,
      2,
      p.id,
      p.slug,
      p.id,
      expandedSet,
      allChildren.length,
    );
  }
  return nodes;
}

function flattenChildren(
  nodes: FlatNode[],
  folders: TreeFolder[],
  mockups: TreeMockup[],
  level: number,
  parentId: string,
  projectSlug: string,
  projectId: string,
  expandedSet: Set<string>,
  totalSiblings: number,
  parentPath: ReadonlyArray<string> = [],
) {
  let posCounter = 1;
  for (const f of folders) {
    const fExpanded = expandedSet.has(f.id);
    const folderPath = [...parentPath, f.name];
    nodes.push({
      id: f.id,
      type: 'folder',
      label: f.name,
      level,
      expandable: true,
      expanded: fExpanded,
      parentId,
      href: folderHref(projectSlug, folderPath),
      setSize: totalSiblings,
      posInSet: posCounter++,
      projectSlug,
      projectId,
      childCount: f.children.length + f.mockups.length,
    });
    if (fExpanded) {
      const childTotal = f.children.length + f.mockups.length;
      flattenChildren(
        nodes,
        f.children,
        f.mockups,
        level + 1,
        f.id,
        projectSlug,
        projectId,
        expandedSet,
        childTotal,
        folderPath,
      );
    }
  }
  for (const m of mockups) {
    nodes.push({
      id: m.id,
      type: 'mockup',
      label: m.name,
      level,
      expandable: false,
      expanded: false,
      parentId,
      href: mockupSlugHref(projectSlug, parentPath, m.slug),
      setSize: totalSiblings,
      posInSet: posCounter++,
      projectSlug,
      projectId,
      mockupId: m.id,
    });
  }
}
