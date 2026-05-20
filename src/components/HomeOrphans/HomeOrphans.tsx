'use client';

import MockupCard from '@/app/mockups/MockupCard';
import styles from './HomeOrphans.module.css';

/** Minimal shape consumed by `HomeOrphans`. Phase 2 swaps this for
 *  the canonical `OrphanEntry` from `@/lib/home/types`. Field names
 *  match spec §2.1 verbatim so the integrator can drop the import
 *  in without touching prop wiring. */
interface OrphanItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  updatedAt: string;
  href: string;
}

interface HomeOrphansProps {
  items: OrphanItem[];
}

/**
 * `home-orphans-section` — grid of mockups with `projectId === null`.
 * Returns `null` when empty so a tidy workspace with everything
 * filed away never shows a stray "No project" header.
 */
export function HomeOrphans({ items }: HomeOrphansProps) {
  if (items.length === 0) return null;
  return (
    <section className={styles.section} data-section="orphans">
      <header className={styles.header}>
        <h2 className={styles.title}>No project</h2>
        <span className={styles.count}>
          {items.length} {items.length === 1 ? 'mockup' : 'mockups'}
        </span>
      </header>
      <div className={styles.grid}>
        {items.map((o) => (
          <MockupCard
            key={o.id}
            id={o.id}
            name={o.name}
            slug={o.slug}
            status={o.status}
            updatedAt={o.updatedAt}
            href={o.href}
          />
        ))}
      </div>
    </section>
  );
}
