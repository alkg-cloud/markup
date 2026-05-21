'use client';

import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { BreadcrumbSegment } from '@/components/Breadcrumbs/Breadcrumbs';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { FadeIn } from '@/components/FadeIn';
import { MockupViewerPage } from '@/components/MockupViewer/MockupViewerPage';
import { ProjectSkeleton } from '@/components/Skeleton';
import { useIdentity } from '@/lib/hooks/use-require-auth';
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

  const identity = useIdentity();
  const [resolution, setResolution] = useState<ResolvePayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'not_found' | 'error'>('loading');
  // In-render URL reset — drop the stale resolution synchronously when
  // the user navigates between mockups so the skeleton paints on the
  // same frame as the URL change, not a tick later.
  const [storedPath, setStoredPath] = useState(`${slug}/${pathQuery}`);
  const currentPath = `${slug}/${pathQuery}`;
  if (storedPath !== currentPath) {
    setStoredPath(currentPath);
    setResolution(null);
    setStatus('loading');
  }

  useEffect(() => {
    if (!slug || pathQuery === '') return;
    const controller = new AbortController();
    fetch(`/api/projects/by-slug/${encodeURIComponent(slug)}/resolve?path=${pathQuery}`, {
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
        const json: ResolvePayload = await res.json();
        setResolution(json);
        setStatus('ok');
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setStatus('error');
      });
    return () => controller.abort();
  }, [slug, pathQuery]);

  if (status === 'not_found') notFound();
  if (status === 'error') {
    return <ErrorState error="Failed to load page." />;
  }
  if (status === 'loading' || !resolution) {
    // Folder and mockup paths share the same skeleton — the URL alone
    // can't reliably disambiguate the two, and a slightly-off skeleton
    // is less jarring than the body cross-swapping shapes mid-load.
    return <ProjectSkeleton />;
  }

  if (resolution.kind === 'mockup') {
    return (
      <FadeIn key="loaded-mockup">
        <MockupViewerPage
          mockupId={resolution.mockupId}
          breadcrumbs={resolution.breadcrumbs}
          userName={identity?.name}
          userEmail={identity?.email}
          userRole={identity?.role}
        />
      </FadeIn>
    );
  }

  return (
    <FadeIn key="loaded-folder">
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
        userRole={identity?.role}
      />
    </FadeIn>
  );
}
