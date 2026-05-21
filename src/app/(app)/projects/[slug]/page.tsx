'use client';

import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { BreadcrumbSegment } from '@/components/Breadcrumbs/Breadcrumbs';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { FadeIn } from '@/components/FadeIn';
import { ProjectSkeleton } from '@/components/Skeleton';
import { useIdentity } from '@/lib/hooks/use-require-auth';
import { ProjectContent } from '../../../projects/[slug]/ProjectContent';

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

interface ProjectViewPayload {
  projectName: string;
  projectSlug: string;
  projectId: string;
  projectIcon: string | null;
  folders: FolderSummary[];
  mockups: MockupSummary[];
  breadcrumbs: BreadcrumbSegment[];
}

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const identity = useIdentity();
  const [data, setData] = useState<ProjectViewPayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'not_found' | 'error'>('loading');
  // In-render slug reset — when the URL slug changes, drop the stale
  // payload BEFORE the next paint so the user never sees the previous
  // project's content for a frame between click and skeleton.
  const [storedSlug, setStoredSlug] = useState(slug);
  if (storedSlug !== slug) {
    setStoredSlug(slug);
    setData(null);
    setStatus('loading');
  }

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    fetch(`/api/projects/by-slug/${encodeURIComponent(slug)}/view`, {
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
        const json: ProjectViewPayload = await res.json();
        setData(json);
        setStatus('ok');
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setStatus('error');
      });
    return () => controller.abort();
  }, [slug]);

  if (status === 'not_found') notFound();
  if (status === 'error') {
    return <ErrorState error="Failed to load project." />;
  }
  if (status === 'loading' || !data) {
    return (
      <FadeIn key="loading">
        <ProjectSkeleton />
      </FadeIn>
    );
  }

  return (
    <FadeIn key="loaded">
      <ProjectContent
        projectName={data.projectName}
        projectSlug={data.projectSlug}
        projectId={data.projectId}
        projectIcon={data.projectIcon}
        folders={data.folders}
        mockups={data.mockups}
        breadcrumbs={data.breadcrumbs}
        userName={identity?.name}
        userEmail={identity?.email}
        userRole={identity?.role}
      />
    </FadeIn>
  );
}
