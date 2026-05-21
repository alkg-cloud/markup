'use client';

import styles from './MockupViewerSkeleton.module.css';
import { Skeleton } from './Skeleton';

/**
 * Mockup viewer skeleton — header strip + main viewport + side rail.
 * Mirrors the `MockupViewerPage` layout so the viewer arrival is a
 * straight cross-fade, not a layout jump.
 */
export function MockupViewerSkeleton() {
  return (
    <div className={styles.root} aria-busy="true" aria-live="polite">
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Skeleton width={20} height={20} variant="circle" />
          <Skeleton width={180} height={14} variant="text" />
          <Skeleton width={8} height={8} variant="circle" />
          <Skeleton width={120} height={14} variant="text" />
        </div>
        <div className={styles.headerRight}>
          <Skeleton width={64} height={26} />
          <Skeleton width={26} height={26} />
          <Skeleton width={26} height={26} />
        </div>
      </header>
      <div className={styles.body}>
        <div className={styles.viewport} />
        <div className={styles.rail}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.railItem}>
              <Skeleton width="80%" height={12} variant="text" />
              <Skeleton width="60%" height={10} variant="text" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
