'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GoGrabber } from 'react-icons/go';
import { resolveIconToken } from '@/components/IconPicker/icons';
import { usePopover } from '@/lib/popover/usePopover';
import { MAX_FOLDER_DEPTH } from '@/lib/project/constants';
import { folderHref, mockupSlugHref, projectHref } from '@/lib/project/routes';
import { validateUrlSafeName } from '@/lib/validation/url-safe-name';
import { InlineFolderCreate } from './InlineFolderCreate';
import styles from './ProjectTree.module.css';
import type { DnDNode } from './useTreeDnD';
import { useTreeDnD } from './useTreeDnD';

const cx = (...classes: (string | false | undefined | null)[]) => classes.filter(Boolean).join(' ');

const INDENT_PX = [0, 12, 28, 44, 60];

const EXPANDED_STORAGE_KEY = 'markup.sidebar.expanded';

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface TreeMockup {
  id: string;
  name: string;
  slug: string;
  status: string;
  position: number;
}

export interface TreeFolder {
  id: string;
  name: string;
  position: number;
  children: TreeFolder[];
  mockups: TreeMockup[];
}

export interface TreeProject {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  position: number;
  folders: TreeFolder[];
  mockups: TreeMockup[];
}

interface FlatNode {
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
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        d="M6 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProjectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 6h12" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M2 5V4a1 1 0 011-1h3.5l1.5 1.5H13a1 1 0 011 1V6H3.5L2 5z"
          fill="currentColor"
          opacity="0.3"
        />
        <path d="M1.5 6.5h13l-1.5 7H3l-1.5-7z" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 4a1 1 0 011-1h3.5l1.5 1.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function MockupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="5" y="5" width="4" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="5" y="8" width="6" height="1.5" rx="0.75" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="8" r="1.2" />
      <circle cx="8" cy="8" r="1.2" />
      <circle cx="12" cy="8" r="1.2" />
    </svg>
  );
}

function ProjectIconResolved({ token }: { token: string }) {
  const resolved = resolveIconToken(token);
  if (!resolved) return <ProjectIcon />;
  if (resolved.type === 'emoji') return <span aria-hidden="true">{resolved.content}</span>;
  return <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: resolved.content }} />;
}

/* ── Active-path resolution ───────────────────────────────────────────────── */

function findMockupChain(projects: TreeProject[], mockupIdOrSlug: string): string[] {
  function walkFolders(folders: TreeFolder[]): string[] | null {
    for (const f of folders) {
      for (const m of f.mockups) {
        if (m.id === mockupIdOrSlug || m.slug === mockupIdOrSlug) return [f.id];
      }
      const sub = walkFolders(f.children);
      if (sub) return [f.id, ...sub];
    }
    return null;
  }
  for (const p of projects) {
    for (const m of p.mockups) {
      if (m.id === mockupIdOrSlug || m.slug === mockupIdOrSlug) return [p.id];
    }
    const sub = walkFolders(p.folders);
    if (sub) return [p.id, ...sub];
  }
  return [];
}

function findFolderAncestorIds(project: TreeProject, folderId: string): string[] {
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

function computeActivePathExpanded(
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

interface ReadonlyURLSearchParamsLike {
  get(name: string): string | null;
}

/* ── Flatten tree into navigable list ─────────────────────────────────────── */

function flattenProjects(
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
        label: 'Recentes',
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

/* ── Tree Component ───────────────────────────────────────────────────────── */

interface ProjectTreeProps {
  projects: TreeProject[];
  orphanMockups?: TreeMockup[];
  recents?: Record<string, string[]>;
  mockupNames?: Record<string, string>;
  onCreateFolder?: (projectId: string, parentId: string | null, name: string) => Promise<void>;
  onMove?: (
    dragId: string,
    dragType: 'folder' | 'mockup',
    targetParentId: string | null,
    targetProjectId: string,
    position: number,
  ) => Promise<void>;
  onRename?: (nodeId: string, nodeType: 'folder' | 'mockup', name: string) => Promise<void>;
  onEditProject?: (projectId: string) => void;
  onDelete?: (nodeId: string, nodeType: 'project' | 'folder' | 'mockup') => void;
}

export function ProjectTree({
  projects,
  orphanMockups = [],
  recents = {},
  mockupNames = {},
  onCreateFolder,
  onMove,
  onRename,
  onEditProject,
  onDelete,
}: ProjectTreeProps) {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initial render merges URL-derived expansion + persisted expansion
  // from localStorage in a single lazy initializer. Pages are CSR-only,
  // so `localStorage` is always reachable during the first render and
  // we don't need a post-mount effect to splice the persisted state in.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const seed = computeActivePathExpanded(projects, pathname, searchParams);
    if (seed.size === 0 && projects.length > 0) seed.add(projects[0].id);
    if (typeof window !== 'undefined') {
      try {
        const stored: string[] = JSON.parse(
          window.localStorage.getItem(EXPANDED_STORAGE_KEY) ?? '[]',
        );
        for (const id of stored) seed.add(id);
      } catch {
        // localStorage unavailable; URL-derived state is the floor.
      }
    }
    return seed;
  });
  const [focusIndex, setFocusIndex] = useState(0);
  const [creatingIn, setCreatingIn] = useState<{
    projectId: string;
    parentId: string | null;
  } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; type: 'folder' | 'mockup' } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...expanded]));
    } catch {
      // Storage full or disabled — silently no-op; in-memory state still works.
    }
  }, [expanded]);

  const nodes = flattenProjects(projects, expanded, recents);

  const toggleExpand = useCallback((nodeId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const focusNode = useCallback((index: number) => {
    setFocusIndex(index);
    const el = treeRef.current?.querySelector(`[data-tree-index="${index}"]`) as HTMLElement | null;
    el?.focus();
  }, []);

  const getDescendantIds = useCallback(
    (folderId: string): Set<string> => {
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
    },
    [projects],
  );

  const getNodeDepth = useCallback(
    (nodeId: string): number => {
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
    },
    [projects],
  );

  const getSubtreeDepth = useCallback(
    (nodeId: string): number => {
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
    },
    [projects],
  );

  const dndNodes: DnDNode[] = nodes.map((n) => ({
    id: n.id,
    type: n.type,
    parentId: n.parentId,
    level: n.level,
    projectId: n.projectId,
    expandable: n.expandable,
  }));

  const handleMove = useCallback(
    async (
      dragId: string,
      dragType: 'folder' | 'mockup',
      targetParentId: string | null,
      targetProjectId: string,
      position: number,
    ) => {
      if (onMove) {
        await onMove(dragId, dragType, targetParentId, targetProjectId, position);
        router.refresh();
      }
    },
    [onMove, router],
  );

  const dnd = useTreeDnD({
    nodes: dndNodes,
    getDescendantIds,
    getNodeDepth,
    getSubtreeDepth,
    maxDepth: MAX_FOLDER_DEPTH,
    onToggleExpand: toggleExpand,
    onMove: handleMove,
    announceRef,
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const node = nodes[focusIndex];
      if (!node) return;

      if (dnd.dragState.kbMoveMode) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            if (focusIndex < nodes.length - 1) focusNode(focusIndex + 1);
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (focusIndex > 0) focusNode(focusIndex - 1);
            break;
          case 'Enter':
            e.preventDefault();
            dnd.confirmKbMove(focusIndex);
            break;
          case 'Escape':
            e.preventDefault();
            if (dnd.dragState.kbOriginalIndex != null) focusNode(dnd.dragState.kbOriginalIndex);
            dnd.cancelKbMove();
            break;
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (focusIndex < nodes.length - 1) focusNode(focusIndex + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (focusIndex > 0) focusNode(focusIndex - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (node.expandable && !node.expanded) {
            toggleExpand(node.id);
          } else if (node.expandable && node.expanded) {
            if (focusIndex < nodes.length - 1) focusNode(focusIndex + 1);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (node.expandable && node.expanded) {
            toggleExpand(node.id);
          } else if (node.parentId) {
            const parentIdx = nodes.findIndex((n) => n.id === node.parentId);
            if (parentIdx >= 0) focusNode(parentIdx);
          }
          break;
        case 'Home':
          e.preventDefault();
          focusNode(0);
          break;
        case 'End':
          e.preventDefault();
          focusNode(nodes.length - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (node.expandable) toggleExpand(node.id);
          if (node.href) router.push(node.href);
          break;
        case ' ':
          e.preventDefault();
          if (onMove && (node.type === 'folder' || node.type === 'mockup')) {
            dnd.startKbMove(focusIndex);
          } else {
            if (node.expandable) toggleExpand(node.id);
            if (node.href) router.push(node.href);
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (node.expandable && node.expanded) {
            toggleExpand(node.id);
          } else if (node.parentId) {
            const parentIdx = nodes.findIndex((n) => n.id === node.parentId);
            if (parentIdx >= 0) focusNode(parentIdx);
          }
          break;
      }
    },
    [nodes, focusIndex, focusNode, toggleExpand, router, dnd, onMove],
  );

  useEffect(() => {
    const activePath = computeActivePathExpanded(projects, pathname, searchParams);
    if (activePath.size === 0) return;
    setExpanded((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of activePath) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname, projects, searchParams]);

  useEffect(() => {
    const el = activeRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [pathname, searchParams]);

  const isActive = (href: string) => {
    if (href.startsWith('/?')) {
      const params = new URLSearchParams(href.slice(2));
      return (
        pathname === '/' &&
        searchParams.get('project') === params.get('project') &&
        (searchParams.get('folder') ?? null) === (params.get('folder') ?? null)
      );
    }
    return pathname === href;
  };

  const canDrag = (node: FlatNode) =>
    onMove != null && (node.type === 'folder' || node.type === 'mockup');

  return (
    <>
      <div ref={announceRef} aria-live="assertive" aria-atomic="true" className={styles.srOnly} />
      <div
        ref={treeRef}
        role="tree"
        aria-label="Projetos"
        onKeyDown={handleKeyDown}
        className={styles.tree}
      >
        <div className={styles.sectionHeader} aria-hidden="true">
          PROJECTS
        </div>
        {nodes.map((node, index) => {
          if (node.type === 'recents-header') {
            return (
              <li key={node.id} role="none" className={styles.sectionLabel}>
                Recentes
              </li>
            );
          }

          const indentLevel = Math.min(node.level, 4);
          const indentPx = INDENT_PX[indentLevel] ?? 60;
          const indentClass =
            indentLevel === 1
              ? styles.indent1
              : indentLevel === 2
                ? styles.indent2
                : indentLevel === 3
                  ? styles.indent3
                  : styles.indent4;

          const active = isActive(node.href);
          const displayLabel =
            node.type === 'recents-item' && node.mockupId
              ? (mockupNames[node.mockupId] ?? node.mockupId.slice(0, 8))
              : node.label;
          const isRenaming = renaming?.id === node.id;

          const iconClass =
            node.type === 'project'
              ? styles.iconProject
              : node.type === 'folder'
                ? styles.iconFolder
                : styles.iconMockup;

          const iconElement =
            node.type === 'project' ? (
              node.icon ? (
                <ProjectIconResolved token={node.icon} />
              ) : (
                <ProjectIcon />
              )
            ) : node.type === 'folder' ? (
              <FolderIcon open={node.expanded} />
            ) : (
              <MockupIcon />
            );

          const showEmptyFolder =
            node.type === 'folder' && node.expanded && !nodes.some((n) => n.parentId === node.id);

          const isDragging = dnd.dragState.draggingId === node.id;
          const isDropTarget = dnd.getDropIndicatorStyle(node.id) != null;
          const dropLine = dnd.getDropLinePosition(node.id);

          return (
            <li key={node.id} role="none" className={styles.item}>
              {dropLine === 'before' && (
                <div
                  className={cx(styles.dropLine, styles.dropLineBefore)}
                  style={{ left: indentPx + 16 }}
                />
              )}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by parent tree onKeyDown */}
              <div
                ref={active ? activeRef : undefined}
                role="treeitem"
                tabIndex={index === focusIndex ? 0 : -1}
                data-tree-index={index}
                aria-expanded={node.expandable ? node.expanded : undefined}
                aria-level={node.level}
                aria-setsize={node.setSize}
                aria-posinset={node.posInSet}
                aria-selected={active}
                aria-grabbed={dnd.dragState.kbMoveMode && isDragging ? true : undefined}
                title={displayLabel}
                draggable={canDrag(node)}
                onClick={() => {
                  setFocusIndex(index);
                  if (node.expandable) toggleExpand(node.id);
                  if (node.href) router.push(node.href);
                }}
                onFocus={() => setFocusIndex(index)}
                onDragStart={(e) => dnd.handleDragStart(e, dndNodes[index])}
                onDragOver={(e) => dnd.handleDragOver(e, dndNodes[index])}
                onDragLeave={dnd.handleDragLeave}
                onDrop={(e) => dnd.handleDrop(e, dndNodes[index])}
                onDragEnd={dnd.handleDragEnd}
                className={cx(
                  styles.treeItem,
                  indentClass,
                  active && styles.active,
                  isDragging && styles.dragging,
                  isDropTarget && styles.dropTarget,
                )}
              >
                {canDrag(node) ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    className={styles.dragHandle}
                    aria-label={`Arrastar ${displayLabel}`}
                  >
                    <GoGrabber aria-hidden="true" />
                  </button>
                ) : null}

                {node.expandable ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    className={cx(styles.chevron, node.expanded && styles.chevronOpen)}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(node.id);
                    }}
                  >
                    <ChevronIcon />
                  </button>
                ) : (
                  <span className={styles.chevronSpacer} />
                )}

                <span className={cx(styles.icon, iconClass)}>{iconElement}</span>

                {isRenaming ? (
                  <span className={styles.renameField}>
                    <input
                      className={cx(styles.renameInput, renameError && styles.renameInputError)}
                      value={renameValue}
                      ref={(el) => el?.focus()}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const next = e.target.value;
                        setRenameValue(next);
                        const v = validateUrlSafeName(next.trim());
                        setRenameError(v ? v.message : null);
                      }}
                      onBlur={async () => {
                        const nextName = renameValue.trim();
                        const v = validateUrlSafeName(nextName);
                        if (v) {
                          setRenaming(null);
                          setRenameError(null);
                          return;
                        }
                        setRenaming(null);
                        setRenameError(null);
                        if (nextName && nextName !== displayLabel && onRename) {
                          await onRename(node.id, renaming.type, nextName);
                        }
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          setRenaming(null);
                          setRenameError(null);
                          return;
                        }
                        if (e.key === 'Enter') {
                          e.stopPropagation();
                          const nextName = renameValue.trim();
                          const v = validateUrlSafeName(nextName);
                          if (v) {
                            setRenameError(v.message);
                            return;
                          }
                          setRenaming(null);
                          setRenameError(null);
                          if (nextName && nextName !== displayLabel && onRename) {
                            await onRename(node.id, renaming.type, nextName);
                          }
                        }
                      }}
                    />
                    {renameError && <span className={styles.renameError}>{renameError}</span>}
                  </span>
                ) : (
                  <span className={styles.label}>{displayLabel}</span>
                )}

                {node.childCount != null && node.childCount > 0 && (
                  <span className={styles.count}>{node.childCount}</span>
                )}

                {node.type !== 'recents-item' && (
                  <TreeNodeKebab
                    node={node}
                    displayLabel={displayLabel}
                    onOpen={() => {
                      if (node.href) router.push(node.href);
                    }}
                    onEditProject={onEditProject}
                    onRename={
                      node.type === 'folder' || node.type === 'mockup'
                        ? () => {
                            const renameType = node.type as 'folder' | 'mockup';
                            setRenaming({ id: node.id, type: renameType });
                            setRenameValue(displayLabel);
                          }
                        : undefined
                    }
                    onCreateSubfolder={
                      node.type === 'folder' && onCreateFolder
                        ? () => {
                            const proj = projects.find((p) => p.slug === node.projectSlug);
                            if (proj) {
                              toggleExpand(node.id);
                              setCreatingIn({ projectId: proj.slug, parentId: node.id });
                            }
                          }
                        : undefined
                    }
                    onCreateFolderAtRoot={
                      node.type === 'project' && onCreateFolder
                        ? () => {
                            if (!expanded.has(node.id)) toggleExpand(node.id);
                            setCreatingIn({ projectId: node.projectSlug, parentId: null });
                          }
                        : undefined
                    }
                    onDelete={onDelete}
                  />
                )}
              </div>
              {dropLine === 'after' && (
                <div
                  className={cx(styles.dropLine, styles.dropLineAfter)}
                  style={{ left: indentPx + 16 }}
                />
              )}

              {showEmptyFolder && (
                <div className={styles.emptyFolder} style={{ paddingLeft: indentPx + 34 }}>
                  <span>Pasta vazia</span>
                  {onCreateFolder && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreatingIn({ projectId: node.projectSlug, parentId: node.id });
                      }}
                      className={styles.emptyFolderAction}
                    >
                      + Adicionar mockup
                    </button>
                  )}
                </div>
              )}

              {creatingIn &&
                node.type === 'folder' &&
                creatingIn.parentId === node.id &&
                node.expanded && (
                  <InlineFolderCreate
                    indent={indentPx + 12}
                    onConfirm={async (name) => {
                      if (onCreateFolder) {
                        const proj = projects.find((p) => p.slug === node.projectSlug);
                        if (proj) await onCreateFolder(proj.id, node.id, name);
                      }
                      setCreatingIn(null);
                      router.refresh();
                    }}
                    onCancel={() => setCreatingIn(null)}
                  />
                )}
              {creatingIn &&
                node.type === 'project' &&
                creatingIn.projectId === node.projectSlug &&
                creatingIn.parentId === null &&
                node.expanded && (
                  <InlineFolderCreate
                    indent={indentPx + 12}
                    onConfirm={async (name) => {
                      if (onCreateFolder) {
                        await onCreateFolder(node.projectId, null, name);
                      }
                      setCreatingIn(null);
                      router.refresh();
                    }}
                    onCancel={() => setCreatingIn(null)}
                  />
                )}
            </li>
          );
        })}
        {orphanMockups.length > 0 && (
          <>
            <div className={styles.sectionHeader} aria-hidden="true">
              NO PROJECT
            </div>
            {orphanMockups.map((m) => {
              // Orphans live under the synthetic `unsorted` project so
              // they still get a canonical path-based URL.
              const href = mockupSlugHref('unsorted', [], m.slug);
              const active = pathname === href;
              return (
                <li key={m.id} role="none" className={styles.item}>
                  <div
                    role="treeitem"
                    aria-level={1}
                    aria-selected={active}
                    className={cx(styles.treeItem, styles.indent1, active && styles.active)}
                    tabIndex={-1}
                    title={m.name}
                    onClick={() => router.push(href)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(href);
                      }
                    }}
                  >
                    <span className={styles.iconMockup}>
                      <MockupIcon />
                    </span>
                    <span className={styles.label}>{m.name}</span>
                  </div>
                </li>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}

/* ── TreeNodeKebab ─────────────────────────────────────────────────────── */

interface TreeNodeKebabProps {
  node: FlatNode;
  displayLabel: string;
  onOpen: () => void;
  onEditProject?: (projectId: string) => void;
  onRename?: () => void;
  onCreateSubfolder?: () => void;
  onCreateFolderAtRoot?: () => void;
  onDelete?: (nodeId: string, nodeType: 'project' | 'folder' | 'mockup') => void;
}

/**
 * Per-row kebab for the project tree. Uses `usePopover` so the menu
 * paints in the top-layer and inherits light-dismiss + ESC semantics
 * from the native HTML popover API. One hook per row keeps each
 * popover's open state independent — opening one closes the rest via
 * the spec's single-popover-auto invariant.
 *
 * See `docs/code-style.md § Popovers`.
 */
function TreeNodeKebab({
  node,
  displayLabel,
  onOpen,
  onEditProject,
  onRename,
  onCreateSubfolder,
  onCreateFolderAtRoot,
  onDelete,
}: TreeNodeKebabProps) {
  const kebab = usePopover<HTMLButtonElement, HTMLDivElement>('right');
  const nodeType = node.type as 'project' | 'folder' | 'mockup';
  // Menu trigger is already scoped to a specific row, so the noun adds
  // visual noise without information. `aria-label` keeps the assistive-
  // technology announcement specific (e.g. "Delete project Lumen Coffee").
  const deleteAriaLabel = `Delete ${nodeType} ${displayLabel}`;

  return (
    <>
      <button
        ref={kebab.triggerRef}
        type="button"
        tabIndex={-1}
        className={styles.kebab}
        data-tooltip={`${displayLabel} actions`}
        data-tooltip-align="right"
        aria-label={`Menu for ${displayLabel}`}
        aria-haspopup="menu"
        {...kebab.triggerProps}
        onClick={(e) => e.stopPropagation()}
      >
        <KebabIcon />
      </button>
      <div {...kebab.popoverProps} className={styles.kebabMenu} role="menu">
        {node.href && (
          <button
            type="button"
            role="menuitem"
            className={styles.kebabMenuItem}
            onClick={(e) => {
              e.stopPropagation();
              kebab.close();
              onOpen();
            }}
          >
            Open
          </button>
        )}
        {nodeType === 'project' && onEditProject && (
          <button
            type="button"
            role="menuitem"
            className={styles.kebabMenuItem}
            onClick={(e) => {
              e.stopPropagation();
              kebab.close();
              onEditProject(node.id);
            }}
          >
            Edit
          </button>
        )}
        {onRename && (
          <button
            type="button"
            role="menuitem"
            className={styles.kebabMenuItem}
            onClick={(e) => {
              e.stopPropagation();
              kebab.close();
              onRename();
            }}
          >
            Rename
          </button>
        )}
        {onCreateSubfolder && (
          <button
            type="button"
            role="menuitem"
            className={styles.kebabMenuItem}
            onClick={(e) => {
              e.stopPropagation();
              kebab.close();
              onCreateSubfolder();
            }}
          >
            New subfolder
          </button>
        )}
        {onCreateFolderAtRoot && (
          <button
            type="button"
            role="menuitem"
            className={styles.kebabMenuItem}
            onClick={(e) => {
              e.stopPropagation();
              kebab.close();
              onCreateFolderAtRoot();
            }}
          >
            New folder
          </button>
        )}
        <div className={styles.kebabMenuDivider} />
        <button
          type="button"
          role="menuitem"
          className={styles.kebabMenuItemDanger}
          aria-label={deleteAriaLabel}
          onClick={(e) => {
            e.stopPropagation();
            kebab.close();
            onDelete?.(node.id, nodeType);
          }}
        >
          Delete
        </button>
      </div>
    </>
  );
}
