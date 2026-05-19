'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { projectHref } from '@/lib/project/routes';

interface ProjectsListResponse {
  projects: { id: string; slug: string }[];
}

/**
 * `/projects` — placeholder home that picks the first project (by
 * `position`) and forwards. When the user has no projects yet, render
 * an empty-state message. Future work: a dedicated landing index.
 */
export default function ProjectsIndex() {
  const router = useRouter();
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
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
        if (cancelled) return;
        const first = json.projects[0];
        if (first) {
          router.replace(projectHref(first.slug));
        } else {
          setEmpty(true);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

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
  if (empty) {
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
      >
        Nenhum projeto encontrado.
      </div>
    );
  }
  return null;
}
