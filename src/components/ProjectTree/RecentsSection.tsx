'use client';

import { useCallback, useEffect, useState } from 'react';

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
      <div
        style={{
          padding: '2px var(--space-xs) 2px 24px',
          fontSize: 'var(--type-2xs)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wide)',
          color: 'var(--text-muted)',
          fontWeight: 'var(--weight-semibold)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        Recentes
      </div>
      {ids.map((id) => (
        <a
          key={id}
          href={`/mockups/${id}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            height: 28,
            paddingLeft: 36,
            paddingRight: 'var(--space-sm)',
            fontSize: 'var(--type-sm)',
            color: 'var(--text-dim)',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'background var(--motion-fast) var(--ease-standard)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {mockupNames[id] ?? id.slice(0, 8)}
          </span>
        </a>
      ))}
    </section>
  );
}
