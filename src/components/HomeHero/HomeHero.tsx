'use client';

import styles from './HomeHero.module.css';

interface HomeHeroProps {
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  identityName: string | null;
  identityEmail: string | null;
  updatedSinceYesterdayCount: number;
}

const TIME_OF_DAY_COPY: Record<HomeHeroProps['timeOfDay'], string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
};

function firstName(name: string | null, email: string | null): string {
  if (name?.trim()) return name.trim().split(/\s+/)[0];
  if (email) return email.split('@')[0];
  return 'there';
}

function formatToday(): string {
  const fmt = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return fmt.format(new Date());
}

/**
 * `home-hero` — minimal greeting variant from the projects-home tweaker.
 * Hides the sub-line entirely when nothing has been updated in the last
 * 24h so an empty / freshly-seeded workspace doesn't show a stale
 * "0 mockups updated" string.
 */
export function HomeHero({
  timeOfDay,
  identityName,
  identityEmail,
  updatedSinceYesterdayCount,
}: HomeHeroProps) {
  const greeting = `${TIME_OF_DAY_COPY[timeOfDay]}, ${firstName(identityName, identityEmail)}`;
  const showCount = updatedSinceYesterdayCount > 0;
  const countLabel =
    updatedSinceYesterdayCount === 1
      ? '1 mockup updated'
      : `${updatedSinceYesterdayCount} mockups updated`;

  return (
    <header className={styles.hero}>
      <h1 className={styles.greeting}>{greeting}</h1>
      {showCount && (
        <p className={styles.sub}>
          {formatToday()} · {countLabel} since yesterday
        </p>
      )}
    </header>
  );
}
