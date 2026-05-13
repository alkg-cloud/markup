'use client';

import { type ReactNode, useCallback, useState } from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function Sidebar({ children, footer }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

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
