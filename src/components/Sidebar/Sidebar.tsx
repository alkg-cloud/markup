'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
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
  // On mobile the sidebar is *always* effectively collapsed (the pill is the
  // entry point). Desktop uses the persisted choice.
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  // Drawer open/closed — only meaningful on mobile.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Sync collapsed=true whenever we cross into mobile so the pill renders.
  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close drawer on every route change. Tree rows are <div role="treeitem">
  // not <a href>, so a click-target selector doesn't catch them; observing
  // the pathname catches every navigation (tree click, kebab→Open, logo, etc.).
  useEffect(() => {
    if (isMobile) setDrawerOpen(false);
  }, [pathname, isMobile]);

  const toggle = useCallback(() => {
    if (isMobile) {
      setDrawerOpen(true);
      return;
    }
    setCollapsed((current) => {
      const next = !current;
      writeStoredCollapsedState(next);
      return next;
    });
  }, [isMobile]);

  // Imperatively open/close the native <dialog> so ESC + focus-trap come for free.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg || !isMobile) return;
    if (drawerOpen && !dlg.open) {
      dlg.showModal();
    } else if (!drawerOpen && dlg.open) {
      dlg.close();
    }
  }, [drawerOpen, isMobile]);

  // The native <dialog> dispatches 'close' on ESC + close() — sync state.
  // Deps include isMobile so the effect re-runs when the dialog mounts
  // (first render isMobile=false → no dialog; after hook upgrade isMobile=true
  // → dialog renders, ref assigned, this effect re-runs and installs the listener).
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onClose = () => setDrawerOpen(false);
    dlg.addEventListener('close', onClose);
    return () => dlg.removeEventListener('close', onClose);
  }, [isMobile]);

  // CSS custom prop drives the topbar's left padding when the pill is
  // floating. Only set on desktop (mobile pill overlays content).
  useEffect(() => {
    const root = document.documentElement;
    if (collapsed && !isMobile) {
      root.style.setProperty('--sidebar-inset', 'calc(var(--pill-width) + var(--pill-left) + 8px)');
    } else {
      root.style.removeProperty('--sidebar-inset');
    }
  }, [collapsed, isMobile]);

  const headerBody = (
    <div
      className={[styles.header, collapsed ? styles.headerCollapsed : ''].filter(Boolean).join(' ')}
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
  );

  return (
    <>
      {/* Spacer maintains layout flow while sidebar is position: fixed. */}
      <div
        className={[styles.spacer, collapsed ? styles.spacerCollapsed : '']
          .filter(Boolean)
          .join(' ')}
      />

      {/* Desktop morph sidebar: also hosts the pill on mobile (CSS forces
       *  collapsed dimensions in the mobile media query).
       *  `data-drawer-open` is consumed by the mobile CSS to hide the pill
       *  while the drawer is open — see T5 (Sidebar.module.css). */}
      <nav
        aria-label="Project navigation"
        className={[styles.sidebar, collapsed ? styles.sidebarCollapsed : '']
          .filter(Boolean)
          .join(' ')}
        data-drawer-open={isMobile && drawerOpen ? 'true' : undefined}
      >
        {headerBody}

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

      {/* Mobile drawer: native <dialog> for focus-trap + ESC. Renders only on mobile. */}
      {isMobile && (
        <dialog
          ref={dialogRef}
          aria-label="Navigation menu"
          className={styles.drawer}
          onClick={(e) => {
            // Tap on the dialog element itself (the backdrop scrim) closes.
            if (e.target === dialogRef.current) closeDrawer();
          }}
          onKeyDown={(e) => {
            // ESC is handled natively by <dialog>; this satisfies the
            // a11y lint rule requiring a keyboard counterpart for onClick.
            if (e.key === 'Escape') closeDrawer();
          }}
        >
          <div className={styles.drawerPanel}>
            <button
              type="button"
              className={styles.drawerClose}
              aria-label="Close menu"
              onClick={closeDrawer}
            >
              ✕
            </button>
            <div
              className={styles.drawerScroll}
              onClickCapture={(e) => {
                // Belt-and-suspenders: any click that contains an explicit
                // <a href> still closes the drawer eagerly (visual snappier
                // than waiting for the route effect). Tree rows use
                // role="treeitem" with onClick — those rely on the pathname
                // effect above to trigger closeDrawer after navigation.
                const t = e.target as HTMLElement;
                if (t.closest('a[href]')) closeDrawer();
              }}
            >
              {children}
            </div>
            {footer && <div className={styles.drawerFooter}>{footer}</div>}
          </div>
        </dialog>
      )}
    </>
  );
}
