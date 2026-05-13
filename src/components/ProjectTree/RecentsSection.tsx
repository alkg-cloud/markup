'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/relative-time';
import listStyles from './RecentList.module.css';
import headerStyles from './RecentsSection.module.css';

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

export interface RecentMockup {
  id: string;
  name: string;
  path?: string;
  updatedAt: string;
}

interface RecentsSectionProps {
  projectSlug: string;
  mockups: Record<string, RecentMockup>;
}

export function RecentsSection({ projectSlug, mockups }: RecentsSectionProps) {
  const [ids] = useRecents(projectSlug);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const visibleIds = ids.filter((id) => mockups[id]);
  if (visibleIds.length === 0) return null;

  return (
    <section aria-label="Recentes">
      <div className={headerStyles.header}>Recentes</div>
      <div className={listStyles.list}>
        {visibleIds.map((id) => {
          const m = mockups[id];
          return (
            <a key={id} href={`/mockups/${id}`} className={listStyles.item}>
              <span className={listStyles.itemIcon} aria-hidden="true">
                📄
              </span>
              <div className={listStyles.itemInfo}>
                <div className={listStyles.itemName}>{m.name}</div>
                {m.path && <div className={listStyles.itemPath}>{m.path}</div>}
              </div>
              <span className={listStyles.itemTime}>
                {formatRelativeTime(new Date(m.updatedAt), now)}
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
