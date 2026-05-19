'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { VscLayoutSidebarLeft, VscLayoutSidebarLeftOff } from 'react-icons/vsc';
import styles from './Sidebar.module.css';

const SIDEBAR_COOKIE_KEY = 'markup-sidebar-collapsed';
// Persist for ~1 year so the user's choice survives the session. Same
// expiry as auth so the cookie is "settings"-grade, not session-grade.
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function writeStoredCollapsedState(next: boolean) {
  try {
    document.cookie = `${SIDEBAR_COOKIE_KEY}=${next ? 'true' : 'false'}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    // Cookie write can fail in some browser modes; SSR will catch up
    // on the next request anyway.
  }
}

interface SidebarProps {
  children: ReactNode;
  footer?: ReactNode;
  /** Initial collapsed state — read from the cookie on the server so
   *  SSR + first paint match the persisted user choice and React
   *  hydration doesn't have to do a one-frame morph from expanded →
   *  collapsed. */
  defaultCollapsed?: boolean;
}

export function Sidebar({ children, footer, defaultCollapsed = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = useCallback(
    () =>
      setCollapsed((current) => {
        const next = !current;
        writeStoredCollapsedState(next);
        return next;
      }),
    [],
  );

  // Keep React state aligned with the cookie if it changes elsewhere
  // (e.g. another tab toggles via `storage` event). Cookie itself is
  // the source of truth.
  useEffect(() => {
    const onStorage = () => {
      const cookieMatch = document.cookie.match(new RegExp(`${SIDEBAR_COOKIE_KEY}=(true|false)`));
      if (cookieMatch) setCollapsed(cookieMatch[1] === 'true');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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
