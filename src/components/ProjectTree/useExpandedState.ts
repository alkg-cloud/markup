'use client';

import { useEffect, useState } from 'react';
import { computeActivePathExpanded } from './treeHelpers';
import type { ReadonlyURLSearchParamsLike, TreeProject } from './treeTypes';

const EXPANDED_STORAGE_KEY = 'markup.sidebar.expanded';

/* ── Expanded-id state with URL seeding + localStorage persistence ────────
 *
 * The initial render merges URL-derived expansion + persisted expansion
 * from localStorage in a single lazy initializer. Pages are CSR-only, so
 * `localStorage` is always reachable during the first render and we
 * don't need a post-mount effect to splice the persisted state in.
 *
 * On subsequent URL changes the active-path is re-added (but never
 * removed) so navigating into a deep folder always reveals the row.
 *
 * Returns the set + setter so callers can also handle explicit toggle
 * (via chevron click / keyboard).
 */
export function useExpandedState(
  projects: TreeProject[],
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParamsLike | null,
): [Set<string>, React.Dispatch<React.SetStateAction<Set<string>>>] {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const seed = computeActivePathExpanded(projects, pathname, searchParams);
    if (seed.size === 0 && projects.length > 0) seed.add(projects[0].id);
    if (typeof window !== 'undefined') {
      try {
        const stored: string[] = JSON.parse(
          window.localStorage.getItem(EXPANDED_STORAGE_KEY) ?? '[]',
        );
        for (const id of stored) seed.add(id);
      } catch {
        // localStorage unavailable; URL-derived state is the floor.
      }
    }
    return seed;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...expanded]));
    } catch {
      // Storage full or disabled — silently no-op; in-memory state still works.
    }
  }, [expanded]);

  useEffect(() => {
    const activePath = computeActivePathExpanded(projects, pathname, searchParams);
    if (activePath.size === 0) return;
    setExpanded((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of activePath) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname, projects, searchParams]);

  return [expanded, setExpanded];
}
