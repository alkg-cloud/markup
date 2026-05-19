'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { VscLayoutSidebarLeft, VscLayoutSidebarLeftOff } from 'react-icons/vsc';
import styles from './Sidebar.module.css';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'markup.sidebar.collapsed';

let cachedCollapsedState: boolean | null = null;

function readStoredCollapsedState() {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Resolve the initial collapsed state synchronously during the first
 * render so SSR/CSR don't disagree. Order of precedence:
 *
 * 1. `cachedCollapsedState` (module-level cache populated by prior
 *    mounts or by the inline boot script in `app/layout.tsx`).
 * 2. `documentElement.dataset.sidebarCollapsed === '1'` (the inline
 *    script's signal — runs before React boots so this attribute is
 *    present on the very first paint).
 * 3. localStorage as a last resort.
 *
 * Falls back to `false` (expanded) on the server / when nothing is set.
 */
function getInitialCollapsedState() {
  if (cachedCollapsedState !== null) return cachedCollapsedState;
  if (typeof document !== 'undefined') {
    if (document.documentElement.dataset.sidebarCollapsed === '1') return true;
    return readStoredCollapsedState();
  }
  return false;
}

interface SidebarProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function Sidebar({ children, footer }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(getInitialCollapsedState);

  const toggle = useCallback(
    () =>
      setCollapsed((current) => {
        const next = !current;
        cachedCollapsedState = next;
        try {
          window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
        } catch {
          // Storage can be unavailable in private modes; in-memory state still works.
        }
        return next;
      }),
    [],
  );

  useEffect(() => {
    const stored = readStoredCollapsedState();
    cachedCollapsedState = stored;
    setCollapsed(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (collapsed) {
      root.style.setProperty('--sidebar-inset', 'calc(var(--pill-width) + var(--pill-left) + 8px)');
    } else {
      root.style.removeProperty('--sidebar-inset');
    }
  }, [collapsed]);

  return (
    <>
      {/* Spacer maintains layout flow while sidebar is position: fixed */}
      <div
        className={[styles.spacer, collapsed ? styles.spacerCollapsed : '']
          .filter(Boolean)
          .join(' ')}
      />

      <nav
        aria-label="Project navigation"
        className={[styles.sidebar, collapsed ? styles.sidebarCollapsed : '']
          .filter(Boolean)
          .join(' ')}
      >
        <div
          className={[styles.header, collapsed ? styles.headerCollapsed : '']
            .filter(Boolean)
            .join(' ')}
        >
          <button type="button" className={styles.logo} title="Go to home">
            M
            <span
              className={[
                styles.logoFull,
                collapsed ? styles.logoFullCollapsed : styles.logoFullExpanded,
              ].join(' ')}
            >
              arkup
            </span>
            <span className={styles.logoDot}>.</span>
          </button>

          <button
            type="button"
            className={[styles.collapseBtn, collapsed ? styles.collapseBtnCollapsed : '']
              .filter(Boolean)
              .join(' ')}
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {/* react-icons replaces the bespoke SVG paths — `VscLayoutSidebarLeft`
                reads as "panel on the left" (so 'click to collapse' when the
                sidebar is currently expanded), `VscLayoutSidebarLeftOff` as
                "sidebar hidden" (so 'click to expand' when collapsed). The
                spans below own visibility via CSS so the swap is purely
                presentational. */}
            <span className={styles.iconCollapse} aria-hidden="true">
              <VscLayoutSidebarLeft />
            </span>
            <span className={styles.iconExpand} aria-hidden="true">
              <VscLayoutSidebarLeftOff />
            </span>
          </button>
        </div>

        <div
          className={[
            styles.scroll,
            collapsed ? styles.scrollCollapsed : styles.scrollExpanded,
          ].join(' ')}
        >
          {children}
        </div>

        {footer && (
          <div
            className={[
              styles.footer,
              collapsed ? styles.footerCollapsed : styles.footerExpanded,
            ].join(' ')}
          >
            {footer}
          </div>
        )}
      </nav>
    </>
  );
}
