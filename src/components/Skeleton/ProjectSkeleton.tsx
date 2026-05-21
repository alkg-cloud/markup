'use client';

import styles from './ProjectSkeleton.module.css';
import { Skeleton } from './Skeleton';

interface ProjectSkeletonProps {
  /** Number of card placeholders to render (defaults to 6). */
  cardCount?: number;
}

/**
 * Project / folder landing-page skeleton. Renders inside `AppShell`'s
 * `<main>` while the page-level fetch is in flight.
 */
export function ProjectSkeleton({ cardCount = 6 }: ProjectSkeletonProps) {
  return (
    <div className={styles.root} aria-busy="true" aria-live="polite">
      <div className={styles.heading}>
        <Skeleton width={32} height={32} variant="circle" />
        <Skeleton width={240} height={28} />
      </div>
      <Skeleton width={140} height={14} variant="text" />
      <div className={styles.cards}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <div key={i} className={styles.card}>
            <Skeleton className={styles.thumb} />
            <Skeleton width="70%" height={14} variant="text" />
            <Skeleton width="45%" height={11} variant="text" />
          </div>
        ))}
      </div>
    </div>
  );
}
