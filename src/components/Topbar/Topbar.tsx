'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { VscKey, VscMail, VscSearch, VscSignOut } from 'react-icons/vsc';
import { type BreadcrumbSegment, Breadcrumbs } from '@/components/Breadcrumbs/Breadcrumbs';
import { usePopover } from '@/lib/popover/usePopover';
import { formatShortcut } from '@/lib/shortcuts/platform';
import styles from './Topbar.module.css';

interface TopbarProps {
  breadcrumbs: BreadcrumbSegment[];
  userName?: string;
  userEmail?: string;
  userRole?: 'admin' | 'member';
  onSearchClick?: () => void;
}

export function Topbar({ breadcrumbs, userName, userEmail, userRole, onSearchClick }: TopbarProps) {
  const initial = userName ? userName.charAt(0).toUpperCase() : 'U';
  const accountMenu = usePopover<HTMLButtonElement, HTMLDivElement>('right');
  const router = useRouter();

  // The command palette uses the same top-layer treatment; close the
  // account menu if the palette opens so two overlays never stack.
  useEffect(() => {
    const closeForPalette = () => accountMenu.close();
    document.addEventListener('open-command-palette', closeForPalette);
    return () => document.removeEventListener('open-command-palette', closeForPalette);
  }, [accountMenu.close]);

  const handleSearchClick = useCallback(() => {
    if (onSearchClick) {
      onSearchClick();
    } else {
      document.dispatchEvent(new CustomEvent('open-command-palette'));
    }
  }, [onSearchClick]);

  const handleLogout = useCallback(async () => {
    accountMenu.close();
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }, [accountMenu.close, router]);

  // Pages are CSR-only — `navigator` is always defined during render, so
  // we can derive the OS-aware label inline via the shared shortcut
  // formatter instead of round-tripping through state + effect.
  const kbdLabel = formatShortcut(['k']);

  return (
    <header className={styles.topbar}>
      <Breadcrumbs segments={breadcrumbs} />

      <button
        type="button"
        className={styles.searchPill}
        aria-label={`Search... (${kbdLabel})`}
        onClick={handleSearchClick}
      >
        <VscSearch size={16} aria-hidden="true" />
        <span className={styles.pillText}>Search...</span>
        <span className={styles.pillKbd}>{kbdLabel}</span>
      </button>

      <div className={styles.topbarRight}>
        <button
          ref={accountMenu.triggerRef}
          type="button"
          className={styles.avatarBtn}
          data-tooltip="Account menu"
          data-tooltip-align="right"
          aria-label="User menu"
          aria-haspopup="menu"
          {...accountMenu.triggerProps}
        >
          {initial}
        </button>
        <div {...accountMenu.popoverProps} className={styles.accountMenu} role="menu">
          <div className={styles.menuHeader}>
            <span className={styles.menuAvatar}>{initial}</span>
            <div className={styles.menuHeaderInfo}>
              <span className={styles.menuHeaderName}>{userName ?? 'User'}</span>
              {userEmail && <span className={styles.menuHeaderEmail}>{userEmail}</span>}
            </div>
          </div>
          <div className={styles.menuDivider} />
          {userRole === 'admin' && (
            <>
              <div className={styles.menuSubhead}>Admin</div>
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => {
                  accountMenu.close();
                  router.push('/settings/invites');
                }}
              >
                <VscMail size={14} aria-hidden="true" />
                Invites
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => {
                  accountMenu.close();
                  router.push('/settings/agents');
                }}
              >
                <VscKey size={14} aria-hidden="true" />
                Agent Tokens
              </button>
              <div className={styles.menuDivider} />
            </>
          )}
          <button
            type="button"
            role="menuitem"
            className={`${styles.menuItem} ${styles.menuItemDanger}`}
            onClick={handleLogout}
          >
            <VscSignOut size={14} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
