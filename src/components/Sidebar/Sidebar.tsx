'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
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

function getInitialCollapsedState() {
  return cachedCollapsedState ?? false;
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
            <span className={styles.iconCollapse}>
              {/* panel-left icon — shown when expanded */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M2 1L1 2V14L2 15H14L15 14V2L14 1H2ZM14 14H7V2H14V14Z"
                />
              </svg>
            </span>
            <span className={styles.iconExpand}>
              {/* panel-left-open icon — shown when collapsed */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M2 1.00073L1 2.00073V14.0007L2 15.0007H14L15 14.0007V2.00073L14 1.00073H2ZM2 14.0007V2.00073H6V14.0007H2ZM7 14.0007V2.00073H14V14.0007H7Z" />
              </svg>
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
