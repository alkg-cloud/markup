'use client';

import { GoGrabber } from 'react-icons/go';
import { NAME_MAX_LENGTH, validateUrlSafeName } from '@/lib/validation/url-safe-name';
import { InlineFolderCreate } from './InlineFolderCreate';
import styles from './ProjectTree.module.css';
import { ChevronIcon, FolderIcon, MockupIcon, ProjectIcon, ProjectIconResolved } from './TreeIcons';
import { TreeNodeKebab } from './TreeNodeKebab';
import type { FlatNode, TreeProject } from './treeTypes';
import type { DnDNode, useTreeDnD } from './useTreeDnD';

const cx = (...classes: (string | false | undefined | null)[]) => classes.filter(Boolean).join(' ');

const INDENT_PX = [0, 12, 28, 44, 60];

export interface RenameTarget {
  id: string;
  type: 'folder' | 'mockup';
}

export interface CreatingTarget {
  projectId: string;
  parentId: string | null;
}

interface TreeNodeProps {
  node: FlatNode;
  dndNode: DnDNode;
  index: number;
  focusIndex: number;
  isEmptyFolder: boolean;
  projects: TreeProject[];
  expanded: Set<string>;
  mockupNames: Record<string, string>;
  dnd: ReturnType<typeof useTreeDnD>;
  canDrag: (node: FlatNode) => boolean;
  isActive: (href: string) => boolean;
  activeRef: React.RefObject<HTMLDivElement | null>;
  renaming: RenameTarget | null;
  renameValue: string;
  renameError: string | null;
  creatingIn: CreatingTarget | null;
  onFocusNode: (index: number) => void;
  onToggleExpand: (nodeId: string) => void;
  onSetRenaming: (target: RenameTarget | null) => void;
  onSetRenameValue: (value: string) => void;
  onSetRenameError: (error: string | null) => void;
  onSetCreatingIn: (target: CreatingTarget | null) => void;
  onNavigate: (href: string) => void;
  onRefresh: () => void;
  onCreateFolder?: (projectId: string, parentId: string | null, name: string) => Promise<void>;
  onRename?: (nodeId: string, nodeType: 'folder' | 'mockup', name: string) => Promise<void>;
  onEditProject?: (projectId: string) => void;
  onDelete?: (nodeId: string, nodeType: 'project' | 'folder' | 'mockup') => void;
}

/**
 * Renders a single tree row plus its drop-line, empty-folder hint, and
 * inline folder-create input. Stateless beyond the props it receives —
 * all mutable state (focus, expansion, rename, creatingIn) lives in the
 * parent `ProjectTree` orchestrator.
 */
export function TreeNode({
  node,
  dndNode,
  index,
  focusIndex,
  isEmptyFolder,
  projects,
  expanded,
  mockupNames,
  dnd,
  canDrag,
  isActive,
  activeRef,
  renaming,
  renameValue,
  renameError,
  creatingIn,
  onFocusNode,
  onToggleExpand,
  onSetRenaming,
  onSetRenameValue,
  onSetRenameError,
  onSetCreatingIn,
  onNavigate,
  onRefresh,
  onCreateFolder,
  onRename,
  onEditProject,
  onDelete,
}: TreeNodeProps) {
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

  const isDragging = dnd.dragState.draggingId === node.id;
  const isDropTarget = dnd.getDropIndicatorStyle(node.id) != null;
  const dropLine = dnd.getDropLinePosition(node.id);

  return (
    <li role="none" className={styles.item}>
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
        // title= is the overflow-disclosure exception — see docs/code-style.md
        title={displayLabel}
        draggable={canDrag(node)}
        onClick={() => {
          onFocusNode(index);
          if (node.expandable) onToggleExpand(node.id);
          if (node.href) onNavigate(node.href);
        }}
        onFocus={() => onFocusNode(index)}
        onDragStart={(e) => dnd.handleDragStart(e, dndNode)}
        onDragOver={(e) => dnd.handleDragOver(e, dndNode)}
        onDragLeave={dnd.handleDragLeave}
        onDrop={(e) => dnd.handleDrop(e, dndNode)}
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
              onToggleExpand(node.id);
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
              maxLength={NAME_MAX_LENGTH}
              ref={(el) => el?.focus()}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const next = e.target.value;
                onSetRenameValue(next);
                const v = validateUrlSafeName(next.trim());
                onSetRenameError(v ? v.message : null);
              }}
              onBlur={async () => {
                const nextName = renameValue.trim();
                const v = validateUrlSafeName(nextName);
                if (v) {
                  onSetRenaming(null);
                  onSetRenameError(null);
                  return;
                }
                onSetRenaming(null);
                onSetRenameError(null);
                if (nextName && nextName !== displayLabel && onRename && renaming) {
                  await onRename(node.id, renaming.type, nextName);
                }
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  onSetRenaming(null);
                  onSetRenameError(null);
                  return;
                }
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  const nextName = renameValue.trim();
                  const v = validateUrlSafeName(nextName);
                  if (v) {
                    onSetRenameError(v.message);
                    return;
                  }
                  onSetRenaming(null);
                  onSetRenameError(null);
                  if (nextName && nextName !== displayLabel && onRename && renaming) {
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
            createdById={node.createdById}
            onOpen={() => {
              if (node.href) onNavigate(node.href);
            }}
            onEditProject={onEditProject}
            onRename={
              node.type === 'folder' || node.type === 'mockup'
                ? () => {
                    const renameType = node.type as 'folder' | 'mockup';
                    onSetRenaming({ id: node.id, type: renameType });
                    onSetRenameValue(displayLabel);
                  }
                : undefined
            }
            onCreateSubfolder={
              node.type === 'folder' && onCreateFolder
                ? () => {
                    const proj = projects.find((p) => p.slug === node.projectSlug);
                    if (proj) {
                      onToggleExpand(node.id);
                      onSetCreatingIn({ projectId: proj.slug, parentId: node.id });
                    }
                  }
                : undefined
            }
            onCreateFolderAtRoot={
              node.type === 'project' && onCreateFolder
                ? () => {
                    if (!expanded.has(node.id)) onToggleExpand(node.id);
                    onSetCreatingIn({ projectId: node.projectSlug, parentId: null });
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

      {isEmptyFolder && (
        <div className={styles.emptyFolder} style={{ paddingLeft: indentPx + 34 }}>
          <span>Pasta vazia</span>
          {onCreateFolder && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetCreatingIn({ projectId: node.projectSlug, parentId: node.id });
              }}
              className={styles.emptyFolderAction}
            >
              + Adicionar mockup
            </button>
          )}
        </div>
      )}

      {creatingIn && node.type === 'folder' && creatingIn.parentId === node.id && node.expanded && (
        <InlineFolderCreate
          indent={indentPx + 12}
          onConfirm={async (name) => {
            if (onCreateFolder) {
              const proj = projects.find((p) => p.slug === node.projectSlug);
              if (proj) await onCreateFolder(proj.id, node.id, name);
            }
            onSetCreatingIn(null);
            onRefresh();
          }}
          onCancel={() => onSetCreatingIn(null)}
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
              onSetCreatingIn(null);
              onRefresh();
            }}
            onCancel={() => onSetCreatingIn(null)}
          />
        )}
    </li>
  );
}

export { INDENT_PX };
