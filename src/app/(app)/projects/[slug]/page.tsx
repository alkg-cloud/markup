'use client';

import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { BreadcrumbSegment } from '@/components/Breadcrumbs/Breadcrumbs';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
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
  const { identity, loading: authLoading } = useRequireAuth();
  const [data, setData] = useState<ProjectViewPayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'not_found' | 'error'>('loading');

  useEffect(() => {
    if (!slug || authLoading || !identity) return;
    let cancelled = false;
    fetch(`/api/projects/by-slug/${encodeURIComponent(slug)}/view`, {
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
        const json: ProjectViewPayload = await res.json();
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
  }, [slug, authLoading, identity]);

  if (status === 'not_found') notFound();
  if (status === 'error') {
    return <main style={{ padding: 24, color: 'var(--danger)' }}>Failed to load project.</main>;
  }
  if (status === 'loading' || !data) {
    return null;
  }

  return (
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
    />
  );
}
