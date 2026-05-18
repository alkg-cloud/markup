'use client';
import { useEffect, useRef, useState } from 'react';
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
 * Version chip — embeds a clock icon inside the chip itself (the
 * standalone History button is removed in this redesign). Click opens a
 * popover listing versions newest-first; per-row kebab surfaces Promote
 * (disabled on current) and Delete.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §5.
 */
export function VersionChip({ versions, onSelect, onPromote, onDelete }: VersionChipProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const current = versions.find((v) => v.current) ?? versions[0];
  const label = current?.label ?? '—';

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveMenu(null);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={[styles.chip, open && styles.open].filter(Boolean).join(' ')}
        data-tooltip="Versions &amp; history"
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
          setActiveMenu(null);
        }}
      >
        <svg className={styles.history} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M13.507 12.324a7 7 0 0 0 .065-8.56A7 7 0 0 0 2 4.393V2H1v3.5l.5.5H5V5H2.811a6.008 6.008 0 1 1-.135 5.77l-.887.462a7 7 0 0 0 11.718 1.092zm-3.361-.97l.708-.707L8 7.792V4H7v4l.146.354 3 3z" />
        </svg>
        {label}
        <svg className={styles.chev} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M3.2 5.8h9.6L8 11.4z" />
        </svg>
      </button>

      <div className={[styles.popover, open && styles.open].filter(Boolean).join(' ')} role="menu">
        <div className={styles.head}>
          <span className={styles.title}>Versions</span>
        </div>
        <ul className={styles.list}>
          {versions.map((v) => (
            // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-checked marks the current row visually; interactive surfaces are the inner kebab + actions.
            // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard users tab into the inner Promote/Delete buttons; row click is a mouse shortcut.
            <li
              key={v.id}
              className={[styles.item, v.current && styles.current].filter(Boolean).join(' ')}
              aria-checked={v.current ? 'true' : 'false'}
              onClick={(e) => {
                if ((e.target as Element).closest(`.${styles.kebab}`)) return;
                if ((e.target as Element).closest(`.${styles.actions}`)) return;
                onSelect?.(v.id);
              }}
            >
              <span className={styles.dot} />
              <div className={styles.meta}>
                <span className={styles.name}>{v.label}</span>
                {v.sub ? <span className={styles.sub}>{v.sub}</span> : null}
              </div>
              <button
                type="button"
                className={[styles.kebab, activeMenu === v.id && styles.menuOpen]
                  .filter(Boolean)
                  .join(' ')}
                data-tooltip={`Version ${v.label} actions`}
                aria-label={`Version ${v.label} actions`}
                aria-haspopup="menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenu((cur) => (cur === v.id ? null : v.id));
                }}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <circle cx="8" cy="3.5" r="1.2" />
                  <circle cx="8" cy="8" r="1.2" />
                  <circle cx="8" cy="12.5" r="1.2" />
                </svg>
              </button>
              <div
                className={[styles.actions, activeMenu === v.id && styles.open]
                  .filter(Boolean)
                  .join(' ')}
                role="menu"
              >
                <button
                  type="button"
                  className={styles.action}
                  role="menuitem"
                  disabled={v.current}
                  data-tooltip={v.current ? 'Already the current version' : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(null);
                    onPromote?.(v.id);
                  }}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M8 1.5 14 7l-.7.7L8.5 3v9.5h-1V3L2.7 7.7 2 7l6-5.5z"
                    />
                  </svg>
                  {v.current ? 'Already current' : 'Promote'}
                </button>
                <button
                  type="button"
                  className={[styles.action, styles.danger].join(' ')}
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(null);
                    onDelete?.(v.id);
                  }}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M10 3h3v1h-1v9l-1 1H4l-1-1V4H2V3h3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1zM9 2H6v1h3V2zM4 13h7V4H4v9z" />
                  </svg>
                  Delete version
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
