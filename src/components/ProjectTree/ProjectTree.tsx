'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_FOLDER_DEPTH } from '@/lib/project/constants';
import { InlineFolderCreate } from './InlineFolderCreate';
import styles from './ProjectTree.module.css';
import type { DnDNode } from './useTreeDnD';
import { useTreeDnD } from './useTreeDnD';

const cx = (...classes: (string | false | undefined | null)[]) => classes.filter(Boolean).join(' ');

const INDENT_PX = [0, 12, 28, 44, 60];

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
  position: number;
  folders: TreeFolder[];
  mockups: TreeMockup[];
}

interface FlatNode {
  id: string;
  type: 'project' | 'folder' | 'mockup' | 'recents-header' | 'recents-item';
  label: string;
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
      <circle cx="8" cy="4" r="1.2" />
      <circle cx="8" cy="8" r="1.2" />
      <circle cx="8" cy="12" r="1.2" />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="3" r="1" />
      <circle cx="8" cy="3" r="1" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="8" cy="6" r="1" />
      <circle cx="4" cy="9" r="1" />
      <circle cx="8" cy="9" r="1" />
    </svg>
  );
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
      level: 1,
      expandable: true,
      expanded: pExpanded,
      parentId: null,
      href: `/projects/${p.slug}`,
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
        nodes.push({
          id: `recent-${p.id}-${recentMockupIds[ri]}`,
          type: 'recents-item',
          label: recentMockupIds[ri],
          level: 3,
          expandable: false,
          expanded: false,
          parentId: `recents-${p.id}`,
          href: `/mockups/${recentMockupIds[ri]}`,
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
) {
  let posCounter = 1;
  for (const f of folders) {
    const fExpanded = expandedSet.has(f.id);
    nodes.push({
      id: f.id,
      type: 'folder',
      label: f.name,
      level,
      expandable: true,
      expanded: fExpanded,
      parentId,
      href: `/projects/${projectSlug}/${f.id}`,
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
      href: `/mockups/${m.id}`,
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
}

export function ProjectTree({
  projects,
  recents = {},
  mockupNames = {},
  onCreateFolder,
  onMove,
}: ProjectTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (projects.length > 0) s.add(projects[0].id);
    return s;
  });
  const [focusIndex, setFocusIndex] = useState(0);
  const [creatingIn, setCreatingIn] = useState<{
    projectId: string;
    parentId: string | null;
  } | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? '';
  const router = useRouter();

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
    for (const p of projects) {
      if (pathname.startsWith(`/projects/${p.slug}`)) {
        setExpanded((prev) => {
          if (prev.has(p.id)) return prev;
          const next = new Set(prev);
          next.add(p.id);
          return next;
        });
      }
    }
  }, [pathname, projects]);

  const isActive = (href: string) => pathname === href;

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

          const iconClass =
            node.type === 'project'
              ? styles.iconProject
              : node.type === 'folder'
                ? styles.iconFolder
                : styles.iconMockup;

          const iconElement =
            node.type === 'project' ? (
              <ProjectIcon />
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
                    <DragHandleIcon />
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

                <span className={styles.label}>{displayLabel}</span>

                {node.childCount != null && node.childCount > 0 && (
                  <span className={styles.count}>{node.childCount}</span>
                )}

                {node.type !== 'recents-item' && (
                  <button
                    type="button"
                    tabIndex={-1}
                    className={styles.kebab}
                    aria-label={`Menu de ${displayLabel}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <KebabIcon />
                  </button>
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
            </li>
          );
        })}
      </div>
    </>
  );
}
