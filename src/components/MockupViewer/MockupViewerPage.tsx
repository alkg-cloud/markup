'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppMainViewerWired } from '@/components/MockupViewer/AppMainViewerWired';
import { ProjectSkeleton } from '@/components/Skeleton';
import type { VersionRow } from '@/components/VersionChip';
import type { AppMainAnnotation } from './AppMainViewer';

interface ViewerPayload {
  mockupId: string;
  mockupName: string;
  mockupSrc: string;
  currentUser: string;
  currentUserColorIndex: number;
  versions: VersionRow[];
  annotations: AppMainAnnotation[];
}

export interface MockupViewerPageProps {
  /** Database id of the mockup. Resolved upstream from the URL path. */
  mockupId: string;
  /** Viewer role — flows into `AppMainViewerWired` so admin-only
   *  affordances (delete, move) can gate on it. */
  userRole?: 'admin' | 'member';
}

/**
 * Mockup viewer page surface. Client component — fetches
 * `/api/mockups/[id]/viewer` on mount and hands the payload to
 * `AppMainViewerWired`. The aggregator endpoint owns every Prisma
 * read + display-name resolution + annotation rollup that used to be
 * inlined in this file as a server component.
 */
export function MockupViewerPage({ mockupId, userRole }: MockupViewerPageProps) {
  const searchParams = useSearchParams();
  const viewingVid = searchParams.get('v');
  const [data, setData] = useState<ViewerPayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'not_found' | 'error'>('loading');
  // In-render mockupId reset — drop the stale viewer payload
  // synchronously when the user switches mockups so the skeleton
  // paints on the same frame as the URL change.
  const [storedMockupId, setStoredMockupId] = useState(mockupId);
  if (storedMockupId !== mockupId) {
    setStoredMockupId(mockupId);
    setData(null);
    setStatus('loading');
  }

  useEffect(() => {
    if (!mockupId) return;
    const controller = new AbortController();
    fetch(`/api/mockups/${encodeURIComponent(mockupId)}/viewer`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.replace('/login');
          return;
        }
        if (res.status === 404) {
          setStatus('not_found');
          return;
        }
        if (!res.ok) {
          setStatus('error');
          return;
        }
        const json: ViewerPayload = await res.json();
        setData(json);
        setStatus('ok');
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setStatus('error');
      });
    return () => controller.abort();
  }, [mockupId]);

  if (status === 'not_found') {
    return <main style={{ padding: 24 }}>Mockup not found.</main>;
  }
  if (status === 'error') {
    return <main style={{ padding: 24, color: 'var(--danger)' }}>Failed to load mockup.</main>;
  }
  if (status === 'loading' || !data) {
    // Project / folder / mockup all share the same skeleton — the URL
    // can't always disambiguate them, and a unified placeholder is
    // less jarring than the body cross-swapping shapes mid-load.
    return <ProjectSkeleton />;
  }

  const currentVid = data.versions.find((v) => v.current)?.id ?? data.versions[0]?.id ?? '';

  return (
    <AppMainViewerWired
      mockupId={data.mockupId}
      mockupName={data.mockupName}
      mockupSrc={data.mockupSrc}
      currentUser={data.currentUser}
      currentUserColorIndex={data.currentUserColorIndex}
      versions={data.versions}
      initialAnnotations={data.annotations}
      viewerIsAdmin={userRole === 'admin'}
      currentVid={currentVid}
      viewingVid={viewingVid}
    />
  );
}
