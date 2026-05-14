'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type BreadcrumbSegment, Breadcrumbs } from '@/components/Breadcrumbs/Breadcrumbs';
import styles from './Topbar.module.css';

interface TopbarProps {
  breadcrumbs: BreadcrumbSegment[];
  userName?: string;
  userEmail?: string;
  onSearchClick?: () => void;
}

export function Topbar({ breadcrumbs, userName, userEmail, onSearchClick }: TopbarProps) {
  const initial = userName ? userName.charAt(0).toUpperCase() : 'U';
  const [isMac, setIsMac] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  const handleSearchClick = useCallback(() => {
    if (onSearchClick) {
      onSearchClick();
    } else {
      document.dispatchEvent(new CustomEvent('open-command-palette'));
    }
  }, [onSearchClick]);

  const handleLogout = useCallback(async () => {
    setMenuOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }, [router]);

  const kbdLabel = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <header className={styles.topbar}>
      <Breadcrumbs segments={breadcrumbs} />

      <button
        type="button"
        className={styles.searchPill}
        aria-label={`Search... (${kbdLabel})`}
        onClick={handleSearchClick}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className={styles.pillText}>Search...</span>
        <span className={styles.pillKbd}>{kbdLabel}</span>
      </button>

      <div className={styles.topbarRight} ref={menuRef}>
        <button
          type="button"
          className={styles.avatarBtn}
          aria-label="User menu"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {initial}
        </button>
        {menuOpen && (
          <div className={styles.accountMenu} role="menu">
            <div className={styles.menuHeader}>
              <span className={styles.menuAvatar}>{initial}</span>
              <div className={styles.menuHeaderInfo}>
                <span className={styles.menuHeaderName}>{userName ?? 'User'}</span>
                {userEmail && <span className={styles.menuHeaderEmail}>{userEmail}</span>}
              </div>
            </div>
            <div className={styles.menuDivider} />
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                setMenuOpen(false);
                router.push('/settings/agents');
              }}
            >
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
                  d="M11.351 1.091a4.528 4.528 0 0 1 3.44 3.16c.215.724.247 1.49.093 2.23a4.583 4.583 0 0 1-4.437 3.6c-.438 0-.874-.063-1.293-.19l-.8.938-.379.175H7v1.5l-.5.5H5v1.5l-.5.5h-3l-.5-.5v-2.307l.146-.353L6.12 6.87a4.464 4.464 0 0 1-.2-1.405 4.528 4.528 0 0 1 5.431-4.375zm1.318 7.2a3.568 3.568 0 0 0 1.239-2.005l.004.005A3.543 3.543 0 0 0 9.72 2.08a3.576 3.576 0 0 0-2.8 3.4c-.01.456.07.908.239 1.33l-.11.543L2 12.404v1.6h2v-1.5l.5-.5H6v-1.5l.5-.5h1.245l.876-1.016.561-.14a3.47 3.47 0 0 0 1.269.238 3.568 3.568 0 0 0 2.218-.795zm-.838-2.732a1 1 0 1 0-1.662-1.11 1 1 0 0 0 1.662 1.11z"
                />
              </svg>
              Agent Tokens
            </button>
            <div className={styles.menuDivider} />
            <button
              type="button"
              role="menuitem"
              className={`${styles.menuItem} ${styles.menuItemDanger}`}
              onClick={handleLogout}
            >
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
                  d="M11.02 3.77v1.56l1-.99V2.5l-.5-.5h-9l-.5.5v.486L2 3v10.29l.36.46 5 1.72L8 15v-1h3.52l.5-.5v-1.81l-1-1V13H8V4.71l-.33-.46L4.036 3h6.984v.77zM7 14.28l-4-1.34V3.72l4 1.34v9.22zm6.52-5.8H8.55v-1h4.93l-1.6-1.6.71-.7 2.47 2.46v.71l-2.49 2.48-.7-.7 1.65-1.65z"
                />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
