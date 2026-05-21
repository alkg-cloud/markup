/* ── Public tree types ────────────────────────────────────────────────────
 *
 * Shared with `AppShell`, `ProjectSidebar`, `CommandPalette/flatten`, etc.
 * Re-exported from `ProjectTree.tsx` for backwards compatibility with
 * existing imports.
 */

export interface TreeMockup {
  id: string;
  name: string;
  slug: string;
  status: string;
  position: number;
  createdById: string | null;
}

export interface TreeFolder {
  id: string;
  name: string;
  position: number;
  createdById: string | null;
  children: TreeFolder[];
  mockups: TreeMockup[];
}

export interface TreeProject {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  position: number;
  createdById: string | null;
  folders: TreeFolder[];
  mockups: TreeMockup[];
}

/** Flattened, indexable node shape produced by `flattenProjects`. */
export interface FlatNode {
  id: string;
  type: 'project' | 'folder' | 'mockup' | 'recents-header' | 'recents-item';
  label: string;
  icon?: string | null;
  level: number;
  expandable: boolean;
  expanded: boolean;
  parentId: string | null;
  href: string;
  setSize: number;
  posInSet: number;
  projectSlug: string;
  projectId: string;
  mockupId?: string;
  childCount?: number;
  /** cuid of the user who created this node, or null for legacy / agent-created rows.
   *  Used by `useCanDelete` to gate the Delete action in `TreeNodeKebab`. */
  createdById: string | null;
}

export interface ReadonlyURLSearchParamsLike {
  get(name: string): string | null;
}
