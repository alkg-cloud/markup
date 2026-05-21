'use client';

/**
 * `FolderPicker` — tree-popover folder selector (DS 25).
 *
 * The user picks a destination folder for a new mockup. Visually it's a
 * 34px-tall trigger that looks like a select; clicking opens a popover with
 * a recursive folder tree. Selection is "single folder id" — clicking
 * "Project root" emits `null`.
 *
 * Built atop `@radix-ui/react-popover` so we get focus management, click
 * outside, Esc to close, and portal mounting for free. The DS toggles
 * `.is-open` on the trigger when the popover is open; with Radix this is
 * `[data-state="open"]`, which our `.trigger[data-state="open"]` rule hooks
 * into for the accent border + chevron rotate.
 *
 * Public API:
 *
 *   <FolderPicker
 *     projectId={string | null}     // null = no project (Unsorted)
 *     folders={Folder[]}             // { id, name, parentId } — flat list
 *     value={string | null}          // selected folder id, null = project root
 *     onChange={(id: string | null) => void}
 *     triggerLabel?: string          // override the derived trigger label
 *   />
 *
 * Decisions:
 *   - `projectId === null` → trigger is disabled, label "No folder
 *     (Unsorted)". Popover never opens.
 *   - Empty `folders` → popover only carries the "Project root" option.
 *   - The flat `Folder[]` is normalised internally into a tree. Folders that
 *     reference an unknown parent are surfaced at the top level (defensive).
 *   - The "Project root" row is always present so the user can clear their
 *     selection. It sits above the user folders.
 *
 * The CSS is a verbatim port of DS 25's `.folder-picker*` /
 * `.folder-popover*` / `.folder-tree` / `.folder-row` / `.folder-children`
 * blocks — see `FolderPicker.module.css`.
 */

import * as Popover from '@radix-ui/react-popover';
import { type ComponentPropsWithoutRef, forwardRef, useMemo, useState } from 'react';
import styles from './FolderPicker.module.css';

function cn(...names: Array<string | undefined | false | null>): string {
  return names.filter(Boolean).join(' ');
}

export type FolderPickerFolder = {
  id: string;
  name: string;
  parentId: string | null;
};

type FolderNode = FolderPickerFolder & { children: FolderNode[] };

function buildTree(folders: FolderPickerFolder[]): FolderNode[] {
  const byId = new Map<string, FolderNode>();
  for (const f of folders) byId.set(f.id, { ...f, children: [] });

  const roots: FolderNode[] = [];
  for (const f of folders) {
    const node = byId.get(f.id)!;
    if (f.parentId && byId.has(f.parentId)) {
      byId.get(f.parentId)!.children.push(node);
    } else {
      // Treat unknown / null parent ids as top-level (defensive).
      roots.push(node);
    }
  }
  return roots;
}

function findName(folders: FolderPickerFolder[], id: string | null): string | null {
  if (id === null) return null;
  return folders.find((f) => f.id === id)?.name ?? null;
}

type FolderPickerProps = {
  projectId: string | null;
  folders: FolderPickerFolder[];
  value: string | null;
  onChange: (folderId: string | null) => void;
  triggerLabel?: string;
};

export const FolderPicker = forwardRef<HTMLButtonElement, FolderPickerProps>(
  ({ projectId, folders, value, onChange, triggerLabel }, ref) => {
    const [open, setOpen] = useState(false);
    const tree = useMemo(() => buildTree(folders), [folders]);

    const isDisabled = projectId === null;
    const derivedLabel = isDisabled
      ? 'No folder (Unsorted)'
      : (findName(folders, value) ?? 'Project root');
    const label = triggerLabel ?? derivedLabel;

    const handleSelect = (folderId: string | null) => {
      onChange(folderId);
      setOpen(false);
    };

    return (
      <Popover.Root open={open} onOpenChange={(next) => !isDisabled && setOpen(next)}>
        <div className={styles.picker}>
          <Popover.Trigger asChild>
            <button
              ref={ref}
              type="button"
              disabled={isDisabled}
              data-folder-picker-trigger=""
              className={styles.trigger}
              aria-label="Choose folder"
            >
              <span className={styles.triggerIcon} aria-hidden="true">
                📁
              </span>
              <span className={styles.triggerValue}>{label}</span>
              <span className={styles.triggerChev} aria-hidden="true">
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  role="presentation"
                >
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={6}
              className={styles.popover}
              data-folder-popover=""
              // Match the trigger width so the popover visually anchors.
              style={{ width: 'var(--radix-popover-trigger-width)' }}
            >
              <div className={styles.popoverHead}>
                <span>Folders</span>
              </div>
              <div className={styles.popoverBody}>
                <ul className={styles.tree}>
                  <li>
                    <FolderRow
                      label="Project root"
                      icon="·"
                      iconIsLeaf
                      selected={value === null}
                      onSelect={() => handleSelect(null)}
                    />
                  </li>
                  {tree.map((node) => (
                    <FolderTreeNode
                      key={node.id}
                      node={node}
                      selectedId={value}
                      onSelect={handleSelect}
                    />
                  ))}
                </ul>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </div>
      </Popover.Root>
    );
  },
);
FolderPicker.displayName = 'FolderPicker';

type FolderTreeNodeProps = {
  node: FolderNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function FolderTreeNode({ node, selectedId, onSelect }: FolderTreeNodeProps) {
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <FolderRow
        label={node.name}
        icon={hasChildren ? '▾' : '·'}
        iconIsLeaf={!hasChildren}
        selected={selectedId === node.id}
        onSelect={() => onSelect(node.id)}
      />
      {hasChildren && (
        <ul className={styles.children} data-folder-children="">
          {node.children.map((child) => (
            <FolderTreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

type FolderRowProps = ComponentPropsWithoutRef<'button'> & {
  label: string;
  icon: string;
  iconIsLeaf?: boolean;
  selected?: boolean;
  onSelect: () => void;
};

function FolderRow({
  label,
  icon,
  iconIsLeaf,
  selected,
  onSelect,
  className,
  ...rest
}: FolderRowProps) {
  return (
    <button
      type="button"
      data-folder-row=""
      data-selected={selected ? 'true' : 'false'}
      className={cn(styles.row, className)}
      onClick={onSelect}
      {...rest}
    >
      <span className={styles.rowChevron} data-leaf={iconIsLeaf ? 'true' : 'false'}>
        {icon}
      </span>
      <span className={styles.rowFicon} aria-hidden="true">
        📁
      </span>
      <span className={styles.rowName}>{label}</span>
    </button>
  );
}
