'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/relative-time';
import listStyles from './RecentList.module.css';
import headerStyles from './RecentsSection.module.css';

const MAX_RECENTS = 5;
const STORAGE_PREFIX = 'markup_recents_';

function readStoredRecents(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

export function useRecents(projectSlug: string): [string[], (mockupId: string) => void] {
  const key = `${STORAGE_PREFIX}${projectSlug}`;
  // Lazy initializer reads from localStorage during render of the FIRST
  // mount only — avoids the "set state in useEffect to mirror storage"
  // double-render. Pages are CSR-only, so the `typeof window` guard is
  // belt-and-braces against pre-rendering edge cases.
  const [ids, setIds] = useState<string[]>(() => readStoredRecents(key));

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
  /** Canonical path-based URL — pre-computed server-side because the
   *  client can't async-walk the folder chain. */
  href: string;
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
    <section aria-label="Recents">
      <div className={headerStyles.header}>Recents</div>
      <div className={listStyles.list}>
        {visibleIds.map((id) => {
          const m = mockups[id];
          return (
            <a key={id} href={m.href} className={listStyles.item}>
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
