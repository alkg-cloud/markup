'use client';

import { useCallback, useEffect, useState } from 'react';
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
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--danger)',
          fontSize: 'var(--type-sm)',
        }}
      >
        Failed to load projects ({error}).
      </div>
    );
  }

  if (!projects) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 'var(--type-sm)',
        }}
        aria-busy="true"
      >
        Loading…
      </div>
    );
  }

  return <AllProjectsPage projects={projects} onMutated={reload} />;
}
