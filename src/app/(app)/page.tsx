'use client';

import { useCallback, useEffect, useState } from 'react';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { FadeIn } from '@/components/FadeIn';
import { ProjectSkeleton } from '@/components/Skeleton';
import type { HomeData } from '@/lib/home/types';
import { AllProjectsPage } from './AllProjectsPage';

/**
 * Workspace landing at `/` — the redesigned home dashboard. Fetches
 * the workspace aggregator (`GET /api/home`) in a single round-trip
 * and forwards the resolved `HomeData` to `AllProjectsPage`, which
 * renders the 4 stacked sections (Hero → Recents → Projects → Orphans)
 * and owns the dialog UI.
 */
export default function Root() {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setError(null);
    const controller = new AbortController();
    fetch('/api/home', { credentials: 'include', signal: controller.signal })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.replace('/login');
          return;
        }
        if (!res.ok) {
          setError(`http_${res.status}`);
          return;
        }
        const json: HomeData = await res.json();
        setData(json);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setError(String(e));
      });
    return () => controller.abort();
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  if (error) {
    return <ErrorState error={`Failed to load home (${error}).`} onRetry={reload} />;
  }

  if (!data) {
    return (
      <FadeIn key="loading">
        <ProjectSkeleton />
      </FadeIn>
    );
  }

  return (
    <FadeIn key="loaded">
      <AllProjectsPage data={data} onMutated={reload} />
    </FadeIn>
  );
}
