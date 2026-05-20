'use client';

import MockupCard from '@/app/mockups/MockupCard';
import styles from './HomeRecents.module.css';

/** Minimal shape consumed by `HomeRecents`. Phase 2 swaps this for
 *  the canonical `RecentEntry` from `@/lib/home/types` once Task A
 *  has landed; keeping a local interface avoids a cross-subagent
 *  race in Phase 1. Field names must match spec §2.1 exactly. */
interface RecentItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  updatedAt: string;
  href: string;
  breadcrumb: string;
}

interface HomeRecentsProps {
  items: RecentItem[];
}

/**
 * `home-recents-section` — cross-project grid of the most recent
 * mockups. Renders nothing when there are zero items so an empty
 * workspace falls straight from the hero into the projects empty
 * state without an awkward "Continue working" header.
 */
export function HomeRecents({ items }: HomeRecentsProps) {
  if (items.length === 0) return null;
  return (
    <section className={styles.section} data-section="recents">
      <header className={styles.header}>
        <h2 className={styles.title}>Continue working</h2>
        <span className={styles.count}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </header>
      <div className={styles.grid}>
        {items.map((r) => (
          <MockupCard
            key={r.id}
            id={r.id}
            name={r.name}
            slug={r.slug}
            status={r.status}
            updatedAt={r.updatedAt}
            href={r.href}
            subtitle={r.breadcrumb}
          />
        ))}
      </div>
    </section>
  );
}
