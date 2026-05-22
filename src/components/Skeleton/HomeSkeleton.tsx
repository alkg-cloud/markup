'use client';

import { useEffect, useState } from 'react';
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

interface HeroBits {
  greeting: string;
  today: string;
}

/**
 * Workspace landing skeleton. Greeting + date render as real text once
 * `useEffect` has resolved them on the client — otherwise the server
 * would produce one locale + timezone and the client another, which
 * desync after hydration. While the bits are unresolved we paint
 * skeleton bars at the hero so the layout doesn't shift on arrival.
 * The "N mockups updated since yesterday" count is always a mini text
 * skeleton — it depends on the per-tenant API and never paints from
 * the skeleton state.
 */
export function HomeSkeleton() {
  const identity = useIdentity();
  // Defer hero text to a post-mount effect so SSR + first client paint
  // agree (both render the skeleton bars), then upgrade to real text.
  // Avoids the locale + timezone hydration mismatches that
  // `suppressHydrationWarning` only hides without fixing.
  const [hero, setHero] = useState<HeroBits | null>(null);
  useEffect(() => {
    setHero({
      greeting: `${TIME_OF_DAY_COPY[deriveTimeOfDay()]}, ${deriveFirstName(identity?.name, identity?.email)}`,
      today: formatToday(),
    });
  }, [identity?.name, identity?.email]);

  return (
    <div className={styles.page}>
      <main className={styles.main} aria-label="Home" aria-busy="true" aria-live="polite">
        <header className={styles.hero}>
          {hero ? (
            <>
              <h1 className={styles.greeting}>{hero.greeting}</h1>
              <p className={styles.sub}>
                <span>{hero.today} · </span>
                <Skeleton className={styles.subCount} width={170} height={10} variant="text" />
              </p>
            </>
          ) : (
            <>
              <Skeleton width={280} height={28} />
              <Skeleton width={220} height={11} variant="text" />
            </>
          )}
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
