'use client';

import { VscAdd } from 'react-icons/vsc';
import { SectionHeader } from '@/components/ProjectTree/SectionHeader';
import sectionHeaderStyles from '@/components/ProjectTree/SectionHeader.module.css';
import styles from './SidebarTreeSkeleton.module.css';
import { Skeleton } from './Skeleton';

/**
 * Tree-rows placeholder rendered inside the real `<Sidebar>` scaffold
 * while `/api/shell` is in flight. The brand, collapse button, and
 * footer stay real; only the tree itself is faked here. The Projects
 * and No-project section headers are rendered as real text so the
 * sidebar's structural rhythm is preserved across the load.
 */
export function SidebarTreeSkeleton() {
  return (
    <div className={styles.root} aria-busy="true" aria-live="polite">
      <SectionHeader
        action={
          <span className={sectionHeaderStyles.actionBtn} aria-hidden="true">
            <VscAdd size={11} />
          </span>
        }
      >
        Projects
      </SectionHeader>

      {[78, 62, 70, 55, 48].map((w, i) => (
        <div key={i} className={styles.row}>
          <Skeleton width={12} height={12} variant="circle" />
          <Skeleton width={`${w}%`} height={11} variant="text" />
        </div>
      ))}

      <SectionHeader>No project</SectionHeader>
      {[64, 50].map((w, i) => (
        <div key={i} className={styles.row}>
          <Skeleton width={12} height={12} variant="circle" />
          <Skeleton width={`${w}%`} height={11} variant="text" />
        </div>
      ))}
    </div>
  );
}
