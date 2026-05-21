'use client';

import styles from './ShellSkeleton.module.css';
import { Skeleton } from './Skeleton';

/**
 * Initial-paint placeholder for the entire `AppShell` while
 * `useRequireAuth()` resolves and `/api/shell` is in flight.
 *
 * Mirrors the real shell's two-column grid (sidebar + main) so the
 * layout doesn't shift when the real content lands. The right column
 * renders a generic "header + card grid" pattern that matches the
 * home page; project / folder pages render their own loading skeleton
 * after this shell-skeleton hands off.
 */
export function ShellSkeleton() {
  return (
    <div className={styles.root} aria-busy="true" aria-live="polite">
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Skeleton width={28} height={28} variant="circle" />
          <Skeleton width={84} height={16} variant="text" />
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Skeleton width={64} height={10} variant="text" />
            <Skeleton width={16} height={16} variant="circle" />
          </div>
          <div className={styles.row}>
            <Skeleton width={14} height={14} variant="circle" />
            <Skeleton width="60%" height={14} variant="text" />
          </div>
          <div className={styles.row} style={{ paddingLeft: '24px' }}>
            <Skeleton width={14} height={14} variant="circle" />
            <Skeleton width="45%" height={14} variant="text" />
          </div>
          <div className={styles.row} style={{ paddingLeft: '24px' }}>
            <Skeleton width={14} height={14} variant="circle" />
            <Skeleton width="50%" height={14} variant="text" />
          </div>
          <div className={styles.row}>
            <Skeleton width={14} height={14} variant="circle" />
            <Skeleton width="55%" height={14} variant="text" />
          </div>
          <div className={styles.row}>
            <Skeleton width={14} height={14} variant="circle" />
            <Skeleton width="70%" height={14} variant="text" />
          </div>
        </div>

        <div className={styles.footer}>
          <Skeleton height={34} width="100%" />
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.heading}>
          <Skeleton width={220} height={26} />
          <Skeleton width={320} height={14} variant="text" />
        </div>
        <Skeleton width={160} height={18} variant="text" />
        <div className={styles.cardsRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.card}>
              <Skeleton className={styles.cardThumb} />
              <Skeleton width="70%" height={14} variant="text" />
              <Skeleton width="45%" height={11} variant="text" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
