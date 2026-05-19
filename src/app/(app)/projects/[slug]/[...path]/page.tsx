'use client';

import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { BreadcrumbSegment } from '@/components/Breadcrumbs/Breadcrumbs';
import { MockupViewerPage } from '@/components/MockupViewer/MockupViewerPage';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { ProjectContent } from '../../../../projects/[slug]/ProjectContent';

interface FolderSummary {
  id: string;
  name: string;
  childCount: number;
}

interface MockupSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  updatedAt: string;
  annotationCount: number;
}

type ResolvePayload =
  | { kind: 'mockup'; mockupId: string; breadcrumbs: BreadcrumbSegment[] }
  | {
      kind: 'folder';
      projectName: string;
      projectSlug: string;
      projectId: string;
      projectIcon: string | null;
      folderName: string;
      currentFolderId: string;
      folderPathNames: string[];
      folders: FolderSummary[];
      mockups: MockupSummary[];
      breadcrumbs: BreadcrumbSegment[];
    };

/**
 * Catch-all client page under `/projects/<slug>/...`. Asks
 * `GET /api/projects/by-slug/<slug>/resolve?path=…` to figure out
 * whether the trailing segments name a folder or a mockup, then
 * renders the matching surface.
 */
export default function ProjectPathPage() {
  const params = useParams<{ slug: string; path: string[] }>();
  const slug = params.slug;
  const pathSegments = (params.path ?? []) as string[];
  const pathQuery = pathSegments.map(encodeURIComponent).join('/');

  const { identity, loading: authLoading } = useRequireAuth();
  const [resolution, setResolution] = useState<ResolvePayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'not_found' | 'error'>('loading');

  useEffect(() => {
    if (!slug || pathQuery === '' || authLoading || !identity) return;
    let cancelled = false;
    fetch(`/api/projects/by-slug/${encodeURIComponent(slug)}/resolve?path=${pathQuery}`, {
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
        const json: ResolvePayload = await res.json();
        if (cancelled) return;
        setResolution(json);
        setStatus('ok');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [slug, pathQuery, authLoading, identity]);

  if (status === 'not_found') notFound();
  if (status === 'error') {
    return <main style={{ padding: 24, color: 'var(--danger)' }}>Failed to load page.</main>;
  }
  if (status === 'loading' || !resolution) {
    return null;
  }

  if (resolution.kind === 'mockup') {
    return (
      <MockupViewerPage
        mockupId={resolution.mockupId}
        breadcrumbs={resolution.breadcrumbs}
        userName={identity?.name}
        userEmail={identity?.email}
      />
    );
  }

  return (
    <ProjectContent
      projectName={resolution.projectName}
      projectSlug={resolution.projectSlug}
      projectId={resolution.projectId}
      projectIcon={resolution.projectIcon}
      folderName={resolution.folderName}
      currentFolderId={resolution.currentFolderId}
      folderPathNames={resolution.folderPathNames}
      folders={resolution.folders}
      mockups={resolution.mockups}
      breadcrumbs={resolution.breadcrumbs}
      userName={identity?.name}
      userEmail={identity?.email}
    />
  );
}
