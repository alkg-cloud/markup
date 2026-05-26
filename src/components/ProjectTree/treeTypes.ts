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
  createdBy: string | null;
  createdByType: 'user' | 'agent' | null;
}

export interface TreeFolder {
  id: string;
  name: string;
  position: number;
  createdBy: string | null;
  createdByType: 'user' | 'agent' | null;
  children: TreeFolder[];
  mockups: TreeMockup[];
}

export interface TreeProject {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  position: number;
  createdBy: string | null;
  createdByType: 'user' | 'agent' | null;
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
  /** cuid of the identity (User or AgentToken) that created this node, or null
   *  for legacy / system-created rows. Used together with `createdByType` by
   *  `useCanDelete` to gate the Delete action in `TreeNodeKebab`. */
  createdBy: string | null;
  /** 'user' | 'agent' | null — pairs with `createdBy` for permission checks. */
  createdByType: 'user' | 'agent' | null;
}

export interface ReadonlyURLSearchParamsLike {
  get(name: string): string | null;
}
