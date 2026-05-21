'use client';

import { VscAdd } from 'react-icons/vsc';
import styles from './SidebarTreeSkeleton.module.css';
import { Skeleton } from './Skeleton';

/**
 * Tree-rows placeholder rendered inside the real `<Sidebar>` scaffold
 * while `/api/shell` is in flight. The brand, collapse button, and
 * footer stay real; only the tree itself is faked here. The PROJECTS
 * and NO PROJECT section headers are rendered as real text so the
 * sidebar's structural rhythm is preserved across the load.
 */
export function SidebarTreeSkeleton() {
  return (
    <div className={styles.root} aria-busy="true" aria-live="polite">
      <div className={styles.sectionHeader}>
        <span>Projects</span>
        <span className={styles.headerBtn} aria-hidden="true">
          <VscAdd size={11} />
        </span>
      </div>

      {[78, 62, 70, 55, 48].map((w, i) => (
        <div key={i} className={styles.row}>
          <Skeleton width={12} height={12} variant="circle" />
          <Skeleton width={`${w}%`} height={11} variant="text" />
        </div>
      ))}

      <div className={styles.sectionHeaderOrphan}>NO PROJECT</div>
      {[64, 50].map((w, i) => (
        <div key={i} className={styles.row}>
          <Skeleton width={12} height={12} variant="circle" />
          <Skeleton width={`${w}%`} height={11} variant="text" />
        </div>
      ))}
    </div>
  );
}
