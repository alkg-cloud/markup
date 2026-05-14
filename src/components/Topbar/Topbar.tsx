'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type BreadcrumbSegment, Breadcrumbs } from '@/components/Breadcrumbs/Breadcrumbs';
import styles from './Topbar.module.css';

interface TopbarProps {
  breadcrumbs: BreadcrumbSegment[];
  userName?: string;
  onSearchClick?: () => void;
}

export function Topbar({ breadcrumbs, userName, onSearchClick }: TopbarProps) {
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
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                setMenuOpen(false);
                router.push('/settings/agents');
              }}
            >
              Settings
            </button>
            <div className={styles.menuDivider} />
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
