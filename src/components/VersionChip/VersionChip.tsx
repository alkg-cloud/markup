'use client';
import {
  VscArrowUp,
  VscHistory,
  VscKebabVertical,
  VscTrash,
  VscTriangleDown,
} from 'react-icons/vsc';
import { usePopover } from '@/lib/popover/usePopover';
import styles from './VersionChip.module.css';

export interface VersionRow {
  id: string;
  label: string;
  sub?: string;
  current?: boolean;
}

export interface VersionChipProps {
  /** Versions newest-first. */
  versions: VersionRow[];
  /** Called when a non-current row is clicked → switches to that version. */
  onSelect?: (id: string) => void;
  /** Called when a row's Promote action is invoked. */
  onPromote?: (id: string) => void;
  /** Called when a row's Delete action is invoked. */
  onDelete?: (id: string) => void;
}

/**
 * Version chip — embeds a clock icon inside the chip itself. Click
 * opens a popover listing versions newest-first; per-row kebab
 * surfaces Promote (disabled on current) and Delete. Both popovers
 * use the native HTML popover API (top-layer paint + light dismiss +
 * stacked open).
 *
 * See `docs/code-style.md § Popovers` and the AppMain redesign spec
 * `2026-05-18-app-main-redesign-spec.md` §5.
 */
export function VersionChip({ versions, onSelect, onPromote, onDelete }: VersionChipProps) {
  const chip = usePopover<HTMLButtonElement, HTMLDivElement>('right');
  const current = versions.find((v) => v.current) ?? versions[0];
  const label = current?.label ?? '—';

  return (
    <>
      <button
        ref={chip.triggerRef}
        type="button"
        className={styles.chip}
        data-tooltip="Versions &amp; history"
        aria-haspopup="menu"
        {...chip.triggerProps}
      >
        <VscHistory className={styles.history} aria-hidden="true" />
        {label}
        <VscTriangleDown className={styles.chev} aria-hidden="true" />
      </button>

      <div {...chip.popoverProps} className={styles.popover} role="menu">
        <div className={styles.head}>
          <span className={styles.title}>Versions</span>
        </div>
        <ul className={styles.list}>
          {versions.map((v) => (
            <VersionListRow
              key={v.id}
              row={v}
              onSelect={() => {
                chip.close();
                onSelect?.(v.id);
              }}
              onPromote={() => {
                chip.close();
                onPromote?.(v.id);
              }}
              onDelete={() => {
                chip.close();
                onDelete?.(v.id);
              }}
            />
          ))}
        </ul>
      </div>
    </>
  );
}

interface VersionListRowProps {
  row: VersionRow;
  onSelect: () => void;
  onPromote: () => void;
  onDelete: () => void;
}

/**
 * One row in the version list — has its own per-row kebab popover
 * (Promote / Delete). Nested popovers stack natively: clicking the
 * kebab inside the parent popover opens the row's actions popover
 * without closing the parent (per the HTML popover spec's nested-
 * popover ancestor relationship).
 */
function VersionListRow({ row, onSelect, onPromote, onDelete }: VersionListRowProps) {
  const kebab = usePopover<HTMLButtonElement, HTMLDivElement>('right');
  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-checked marks the current row; interactive surfaces are the inner buttons.
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard users tab into the inner buttons; row click is a mouse shortcut.
    <li
      className={[styles.item, row.current && styles.current].filter(Boolean).join(' ')}
      aria-checked={row.current ? 'true' : 'false'}
      onClick={(e) => {
        if ((e.target as Element).closest(`.${styles.kebab}`)) return;
        if ((e.target as Element).closest(`.${styles.actions}`)) return;
        onSelect();
      }}
    >
      <span className={styles.dot} />
      <div className={styles.meta}>
        <span className={styles.name}>{row.label}</span>
        {row.sub ? <span className={styles.sub}>{row.sub}</span> : null}
      </div>
      <button
        ref={kebab.triggerRef}
        type="button"
        className={styles.kebab}
        data-tooltip={`Version ${row.label} actions`}
        aria-label={`Version ${row.label} actions`}
        aria-haspopup="menu"
        {...kebab.triggerProps}
        onClick={(e) => e.stopPropagation()}
      >
        <VscKebabVertical aria-hidden="true" />
      </button>
      <div {...kebab.popoverProps} className={styles.actions} role="menu">
        <button
          type="button"
          className={styles.action}
          role="menuitem"
          disabled={row.current}
          data-tooltip={row.current ? 'Already the current version' : undefined}
          onClick={() => {
            kebab.close();
            if (!row.current) onPromote();
          }}
        >
          <VscArrowUp aria-hidden="true" />
          {row.current ? 'Already current' : 'Promote'}
        </button>
        <button
          type="button"
          className={[styles.action, styles.danger].join(' ')}
          role="menuitem"
          onClick={() => {
            kebab.close();
            onDelete();
          }}
        >
          <VscTrash aria-hidden="true" />
          Delete
        </button>
      </div>
    </li>
  );
}
