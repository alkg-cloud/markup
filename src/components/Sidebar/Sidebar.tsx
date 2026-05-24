'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { VscLayoutSidebarLeft, VscLayoutSidebarLeftOff } from 'react-icons/vsc';
import { useIsMobile } from '@/hooks/useIsMobile';
import styles from './Sidebar.module.css';

const SIDEBAR_COOKIE_KEY = 'markup-sidebar-collapsed';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function writeStoredCollapsedState(next: boolean) {
  try {
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API not portable.
    document.cookie = `${SIDEBAR_COOKIE_KEY}=${next ? 'true' : 'false'}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    // Cookie write can fail in some browser modes.
  }
}

interface SidebarProps {
  children: ReactNode;
  footer?: ReactNode;
  defaultCollapsed?: boolean;
}

export function Sidebar({ children, footer, defaultCollapsed = false }: SidebarProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  // `collapsed` drives the same morph on both desktop and mobile. The only
  // difference between the two: on mobile, the expanded state floats over
  // content with a scrim — on desktop it claims layout via the spacer.
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // Force the collapsed pill whenever we cross into mobile so the morph
  // starts from the pill side. Desktop keeps the persisted choice.
  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  // Close the mobile overlay on every route change so a tree-row tap that
  // navigates also dismisses the sidebar. Tree rows are <div role="treeitem">
  // (not <a href>), which is why a click-target selector wouldn't catch them.
  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [pathname, isMobile]);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      // Only persist the desktop choice — on mobile, "expanded" is a
      // transient overlay, not a layout preference.
      if (!isMobile) writeStoredCollapsedState(next);
      return next;
    });
  }, [isMobile]);

  // ESC dismisses the mobile overlay. Listener only attached while open
  // so we don't intercept ESC for other UI (modals, popovers) at other times.
  useEffect(() => {
    if (!isMobile || collapsed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCollapsed(true);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMobile, collapsed]);

  // CSS custom prop drives the topbar's left padding so the breadcrumb (or
  // any future left-aligned content) doesn't collide with the floating pill.
  // Set when the pill is the visible shape: desktop-collapsed OR mobile
  // (where the pill is always present unless the overlay is open).
  useEffect(() => {
    const root = document.documentElement;
    if (collapsed || isMobile) {
      root.style.setProperty('--sidebar-inset', 'calc(var(--pill-width) + var(--pill-left) + 8px)');
    } else {
      root.style.removeProperty('--sidebar-inset');
    }
  }, [collapsed, isMobile]);

  return (
    <>
      {/* Spacer maintains layout flow while sidebar is position: fixed.
       *  Hidden on mobile via CSS — the mobile sidebar is an overlay. */}
      <div
        className={[styles.spacer, collapsed ? styles.spacerCollapsed : '']
          .filter(Boolean)
          .join(' ')}
      />

      {/* Scrim — only rendered when the mobile overlay is open. Tap to dismiss. */}
      {isMobile && !collapsed && (
        <button
          type="button"
          aria-label="Close menu"
          className={styles.scrim}
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* The same <nav> morphs pill ↔ expanded on both desktop and mobile.
       *  Mobile gets `position: fixed` + higher z-index from the media query
       *  so the expanded state floats over the topbar/main with the scrim. */}
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
          <Link
            href="/"
            className={styles.logo}
            data-tooltip="Go to projects"
            data-tooltip-align="left"
            aria-label="Go to projects"
          >
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
          </Link>

          <button
            type="button"
            className={[styles.collapseBtn, collapsed ? styles.collapseBtnCollapsed : '']
              .filter(Boolean)
              .join(' ')}
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className={styles.iconCollapse} aria-hidden="true">
              <VscLayoutSidebarLeft />
            </span>
            <span className={styles.iconExpand} aria-hidden="true">
              <VscLayoutSidebarLeftOff />
            </span>
          </button>
        </div>

        <div
          className={[styles.scroll, collapsed ? styles.scrollCollapsed : styles.scrollExpanded]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </div>

        {footer && (
          <div
            className={[styles.footer, collapsed ? styles.footerCollapsed : styles.footerExpanded]
              .filter(Boolean)
              .join(' ')}
          >
            {footer}
          </div>
        )}
      </nav>
    </>
  );
}
