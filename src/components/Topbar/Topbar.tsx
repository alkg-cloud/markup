'use client';

import { type BreadcrumbSegment, Breadcrumbs } from '@/components/Breadcrumbs/Breadcrumbs';
import styles from './Topbar.module.css';

interface TopbarProps {
  breadcrumbs: BreadcrumbSegment[];
  userName?: string;
  onSearchClick?: () => void;
}

export function Topbar({ breadcrumbs, userName, onSearchClick }: TopbarProps) {
  const initial = userName ? userName.charAt(0).toUpperCase() : 'U';

  return (
    <header className={styles.topbar}>
      <Breadcrumbs segments={breadcrumbs} />

      <button
        type="button"
        className={styles.searchPill}
        aria-label="Search... (⌘K)"
        onClick={onSearchClick}
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
        <span className={styles.pillKbd}>⌘K</span>
      </button>

      <div className={styles.topbarRight}>
        <button
          type="button"
          className={styles.avatarBtn}
          aria-label="User menu"
          aria-haspopup="true"
        >
          {initial}
        </button>
      </div>
    </header>
  );
}
