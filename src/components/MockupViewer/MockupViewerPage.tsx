'use client';

import { useEffect, useState } from 'react';
import type { ThreadComment } from '@/components/AnnotationCard';
import type { BreadcrumbSegment } from '@/components/Breadcrumbs/Breadcrumbs';
import { AppMainViewerWired } from '@/components/MockupViewer/AppMainViewerWired';
import { Topbar } from '@/components/Topbar/Topbar';
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
}

/**
 * Mockup viewer page surface. Client component — fetches
 * `/api/mockups/[id]/viewer` on mount and hands the payload to
 * `AppMainViewerWired`. The aggregator endpoint owns every Prisma
 * read + display-name resolution + annotation rollup that used to be
 * inlined in this file as a server component.
 */
export function MockupViewerPage({
  mockupId,
  breadcrumbs,
  userName,
  userEmail,
}: MockupViewerPageProps) {
  const [data, setData] = useState<ViewerPayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'not_found' | 'error'>('loading');

  useEffect(() => {
    if (!mockupId) return;
    let cancelled = false;
    fetch(`/api/mockups/${encodeURIComponent(mockupId)}/viewer`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (cancelled) return;
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
        if (cancelled) return;
        setData(json);
        setStatus('ok');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [mockupId]);

  if (status === 'not_found') {
    return <main style={{ padding: 24 }}>Mockup not found.</main>;
  }
  if (status === 'error') {
    return <main style={{ padding: 24, color: 'var(--danger)' }}>Failed to load mockup.</main>;
  }
  if (status === 'loading' || !data) {
    return null;
  }

  return (
    <>
      <Topbar breadcrumbs={breadcrumbs} userName={userName} userEmail={userEmail} />
      <AppMainViewerWired
        mockupId={data.mockupId}
        mockupName={data.mockupName}
        mockupSrc={data.mockupSrc}
        currentUser={data.currentUser}
        currentUserColorIndex={data.currentUserColorIndex}
        versions={data.versions}
        initialAnnotations={data.annotations}
      />
    </>
  );
}
