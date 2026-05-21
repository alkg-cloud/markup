'use client';

import { useIdentity } from '@/lib/hooks/use-require-auth';
import styles from './HomeSkeleton.module.css';
import { Skeleton } from './Skeleton';

const TIME_OF_DAY_COPY = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
} as const;

function deriveTimeOfDay(): keyof typeof TIME_OF_DAY_COPY {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function deriveFirstName(name: string | null | undefined, email: string | null | undefined) {
  if (name?.trim()) return name.trim().split(/\s+/)[0];
  if (email) return email.split('@')[0];
  return 'there';
}

function formatToday() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

/**
 * Workspace landing skeleton. The hero (greeting + date) renders as
 * real text since both are derived locally — only the
 * "N mockups updated since yesterday" count is unknown and gets a
 * mini text skeleton. Section headers ("Continue working", "Projects",
 * "No project") render as real text; the rows below them are skeleton
 * cards that mirror the post-load grid layout.
 */
export function HomeSkeleton() {
  const identity = useIdentity();
  const greeting = `${TIME_OF_DAY_COPY[deriveTimeOfDay()]}, ${deriveFirstName(identity?.name, identity?.email)}`;

  return (
    <div className={styles.page}>
      <main className={styles.main} aria-label="Home" aria-busy="true" aria-live="polite">
        <header className={styles.hero}>
          <h1 className={styles.greeting}>{greeting}</h1>
          <p className={styles.sub}>
            <span>{formatToday()} · </span>
            <Skeleton className={styles.subCount} width={170} height={10} variant="text" />
          </p>
        </header>

        <section className={styles.section} data-section="recents">
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Continue working</h2>
          </header>
          <div className={styles.grid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.card}>
                <Skeleton className={styles.thumb} />
                <Skeleton width="70%" height={13} variant="text" />
                <Skeleton width="45%" height={10} variant="text" />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} data-section="projects">
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Projects</h2>
          </header>
          <div className={styles.grid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.card}>
                <div className={styles.projectHeader}>
                  <Skeleton width={28} height={28} variant="circle" />
                  <Skeleton width="60%" height={13} variant="text" />
                </div>
                <Skeleton width="40%" height={10} variant="text" />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} data-section="orphans">
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>No project</h2>
          </header>
          <div className={styles.grid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.card}>
                <Skeleton className={styles.thumb} />
                <Skeleton width="70%" height={13} variant="text" />
                <Skeleton width="45%" height={10} variant="text" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
