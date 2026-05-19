'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_FOLDER_DEPTH } from '@/lib/project/constants';
import { mockupSlugHref } from '@/lib/project/routes';
import styles from './ProjectTree.module.css';
import { MockupIcon } from './TreeIcons';
import { type CreatingTarget, type RenameTarget, TreeNode } from './TreeNode';
import { flattenProjects } from './treeFlatten';
import { getDescendantIds, getNodeDepth, getSubtreeDepth } from './treeHelpers';
import type { FlatNode, TreeMockup, TreeProject } from './treeTypes';
import { useExpandedState } from './useExpandedState';
import type { DnDNode } from './useTreeDnD';
import { useTreeDnD } from './useTreeDnD';

const cx = (...classes: (string | false | undefined | null)[]) => classes.filter(Boolean).join(' ');

// Re-export tree types for callers that imported them from this module
// historically (AppShell, ProjectSidebar, CommandPalette/flatten, etc.).
export type { FlatNode, TreeFolder, TreeMockup, TreeProject } from './treeTypes';

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

  const [expanded, setExpanded] = useExpandedState(projects, pathname, searchParams);
  const [focusIndex, setFocusIndex] = useState(0);
  const [creatingIn, setCreatingIn] = useState<CreatingTarget | null>(null);
  const [renaming, setRenaming] = useState<RenameTarget | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement | null>(null);

  const nodes = useMemo(
    () => flattenProjects(projects, expanded, recents),
    [projects, expanded, recents],
  );

  const toggleExpand = useCallback(
    (nodeId: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return next;
      });
    },
    [setExpanded],
  );

  const focusNode = useCallback((index: number) => {
    setFocusIndex(index);
    const el = treeRef.current?.querySelector(`[data-tree-index="${index}"]`) as HTMLElement | null;
    el?.focus();
  }, []);

  const getDescendantIdsCb = useCallback(
    (folderId: string) => getDescendantIds(projects, folderId),
    [projects],
  );
  const getNodeDepthCb = useCallback(
    (nodeId: string) => getNodeDepth(projects, nodeId),
    [projects],
  );
  const getSubtreeDepthCb = useCallback(
    (nodeId: string) => getSubtreeDepth(projects, nodeId),
    [projects],
  );

  const dndNodes: DnDNode[] = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: n.type,
        parentId: n.parentId,
        level: n.level,
        projectId: n.projectId,
        expandable: n.expandable,
      })),
    [nodes],
  );

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
    getDescendantIds: getDescendantIdsCb,
    getNodeDepth: getNodeDepthCb,
    getSubtreeDepth: getSubtreeDepthCb,
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
    const el = activeRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [pathname, searchParams]);

  const isActive = useCallback(
    (href: string) => {
      if (href.startsWith('/?')) {
        const params = new URLSearchParams(href.slice(2));
        return (
          pathname === '/' &&
          searchParams.get('project') === params.get('project') &&
          (searchParams.get('folder') ?? null) === (params.get('folder') ?? null)
        );
      }
      return pathname === href;
    },
    [pathname, searchParams],
  );

  const canDrag = useCallback(
    (node: FlatNode) => onMove != null && (node.type === 'folder' || node.type === 'mockup'),
    [onMove],
  );

  const onNavigate = useCallback((href: string) => router.push(href), [router]);
  const onRefresh = useCallback(() => router.refresh(), [router]);

  return (
    <>
      <div ref={announceRef} aria-live="assertive" aria-atomic="true" className={styles.srOnly} />
      <div
        ref={treeRef}
        role="tree"
        aria-label="Projects"
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
                Recents
              </li>
            );
          }
          const isEmptyFolder =
            node.type === 'folder' && node.expanded && !nodes.some((n) => n.parentId === node.id);
          return (
            <TreeNode
              key={node.id}
              node={node}
              dndNode={dndNodes[index]}
              index={index}
              focusIndex={focusIndex}
              isEmptyFolder={isEmptyFolder}
              projects={projects}
              expanded={expanded}
              mockupNames={mockupNames}
              dnd={dnd}
              canDrag={canDrag}
              isActive={isActive}
              activeRef={activeRef}
              renaming={renaming}
              renameValue={renameValue}
              renameError={renameError}
              creatingIn={creatingIn}
              onFocusNode={setFocusIndex}
              onToggleExpand={toggleExpand}
              onSetRenaming={setRenaming}
              onSetRenameValue={setRenameValue}
              onSetRenameError={setRenameError}
              onSetCreatingIn={setCreatingIn}
              onNavigate={onNavigate}
              onRefresh={onRefresh}
              onCreateFolder={onCreateFolder}
              onRename={onRename}
              onEditProject={onEditProject}
              onDelete={onDelete}
            />
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
