'use client';

import styles from './SettingsListSkeleton.module.css';
import { Skeleton } from './Skeleton';

interface SettingsListSkeletonProps {
  /** How many fake rows to render (defaults to 5). */
  rowCount?: number;
  /** Optional `<h1>` text shown above the list. When omitted the
   *  header line is also a skeleton bar. */
  titleText?: string;
  /** Optional subtitle text below the title. */
  subtitleText?: string;
}

/**
 * Generic skeleton for settings list pages (invites, agent tokens,
 * future "team", "billing"). Mirrors the `AppMain variant="centered"`
 * layout: page header, count + action toolbar, list of rows.
 */
export function SettingsListSkeleton({
  rowCount = 5,
  titleText,
  subtitleText,
}: SettingsListSkeletonProps) {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      {titleText ? (
        <h1 className={styles.title}>{titleText}</h1>
      ) : (
        <Skeleton width={180} height={26} />
      )}
      {subtitleText ? (
        <p className={styles.subtitle}>{subtitleText}</p>
      ) : (
        <Skeleton width={280} height={13} variant="text" />
      )}

      <div className={styles.toolbar}>
        <Skeleton width={120} height={11} variant="text" />
        <Skeleton width={120} height={28} />
      </div>

      <div className={styles.rows}>
        {Array.from({ length: rowCount }).map((_, i) => (
          <div key={i} className={styles.row}>
            <div className={styles.rowMain}>
              <Skeleton width="40%" height={13} variant="text" />
              <Skeleton width="55%" height={11} variant="text" />
            </div>
            <Skeleton width={64} height={11} variant="text" />
            <Skeleton width={28} height={28} variant="circle" />
          </div>
        ))}
      </div>
    </div>
  );
}
