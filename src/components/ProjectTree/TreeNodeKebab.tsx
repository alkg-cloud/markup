'use client';

import { usePopover } from '@/lib/popover/usePopover';
import styles from './ProjectTree.module.css';
import { KebabIcon } from './TreeIcons';
import type { FlatNode } from './treeTypes';

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
export function TreeNodeKebab({
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
