'use client';

import type { ReactNode } from 'react';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  /** Uppercase label text rendered on the left. The component uppercases
   *  it via CSS, so consumers pass the natural form ("Projects",
   *  "No project"). */
  children: ReactNode;
  /** Optional element rendered on the right — typically an icon button.
   *  Used for the inline "+" on the "Projects" header; absent on the
   *  "No project" header. */
  action?: ReactNode;
}

/**
 * Sidebar tree section header. The visual rhythm of the sidebar
 * (project list, no-project list, future "Drafts" / "Archived"
 * sections) all share one label recipe: small uppercase mono text in
 * `--text-muted`, optionally with a single trailing icon-button. This
 * component owns that recipe so the three callers — `ProjectSidebar`'s
 * "Projects" header, `ProjectTree`'s "No project" header, and
 * `SidebarTreeSkeleton`'s placeholder headers — render identically.
 */
export function SectionHeader({ children, action }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <span>{children}</span>
      {action}
    </div>
  );
}
