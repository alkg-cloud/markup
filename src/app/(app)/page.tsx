'use client';

import { useCallback, useEffect, useState } from 'react';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { LoadingState } from '@/components/LoadingState/LoadingState';
import type { ProjectCardData } from '@/components/ProjectCard/ProjectCard';
import { AllProjectsPage } from './AllProjectsPage';

interface ProjectsListResponse {
  projects: ProjectCardData[];
}

/**
 * Workspace landing at `/` — the `all-projects` grid. Fetches the
 * project list with counts and forwards it to `AllProjectsPage`, which
 * owns the grid + dialog UI.
 */
export default function Root() {
  const [projects, setProjects] = useState<ProjectCardData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch('/api/projects', { credentials: 'include' })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          window.location.replace('/login');
          return;
        }
        if (!res.ok) {
          setError(`http_${res.status}`);
          return;
        }
        const json: ProjectsListResponse = await res.json();
        if (!cancelled) setProjects(json.projects);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  if (error) {
    return <ErrorState error={`Failed to load projects (${error}).`} onRetry={reload} />;
  }

  if (!projects) {
    return <LoadingState />;
  }

  return <AllProjectsPage projects={projects} onMutated={reload} />;
}
