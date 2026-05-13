'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './RecentsSection.module.css';

const MAX_RECENTS = 5;
const STORAGE_PREFIX = 'markup_recents_';

export function useRecents(projectSlug: string): [string[], (mockupId: string) => void] {
  const key = `${STORAGE_PREFIX}${projectSlug}`;
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) setIds(JSON.parse(stored));
    } catch {
      /* empty */
    }
  }, [key]);

  const recordAccess = useCallback(
    (mockupId: string) => {
      setIds((prev) => {
        const next = [mockupId, ...prev.filter((id) => id !== mockupId)].slice(0, MAX_RECENTS);
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* quota */
        }
        return next;
      });
    },
    [key],
  );

  return [ids, recordAccess];
}

interface RecentsSectionProps {
  projectSlug: string;
  mockupNames: Record<string, string>;
}

export function RecentsSection({ projectSlug, mockupNames }: RecentsSectionProps) {
  const [ids] = useRecents(projectSlug);

  if (ids.length === 0) return null;

  return (
    <section aria-label="Recentes">
      <div className={styles.header}>Recentes</div>
      {ids.map((id) => (
        <a key={id} href={`/mockups/${id}`} className={styles.link}>
          <span className={styles.linkLabel}>{mockupNames[id] ?? id.slice(0, 8)}</span>
        </a>
      ))}
    </section>
  );
}
