'use client';

import { useEffect, useState } from 'react';
import type { ThreadComment } from '@/components/AnnotationCard';
import type { BreadcrumbSegment } from '@/components/Breadcrumbs/Breadcrumbs';
import { AppMainViewerWired } from '@/components/MockupViewer/AppMainViewerWired';
import { MockupViewerSkeleton } from '@/components/Skeleton';
import type { VersionRow } from '@/components/VersionChip';
import type { Anchor } from '@/lib/anchoring';
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

// Re-export keeps the few existing consumers that import the type
// stable while we move responsibility to the API aggregator.
export type { Anchor, ThreadComment };

export interface MockupViewerPageProps {
  /** Database id of the mockup. Resolved upstream from the URL path. */
  mockupId: string;
  /** Pre-built breadcrumbs from the path resolver. */
  breadcrumbs: BreadcrumbSegment[];
  /** Optional viewer profile blurb for the topbar (passed in by the
   *  parent page; matches what `useRequireAuth` exposes). */
  userName?: string;
  userEmail?: string;
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
    // No FadeIn wrap here — this surface is always rendered inside a
    // parent FadeIn (`/projects/[slug]/[...path]/page.tsx`'s mockup
    // branch). Adding a second FadeIn would double-animate.
    return <MockupViewerSkeleton />;
  }

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
    />
  );
}
