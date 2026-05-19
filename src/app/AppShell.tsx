'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { CommandPalette } from '@/components/CommandPalette/CommandPalette';
import type { TreeMockup, TreeProject } from '@/components/ProjectTree/ProjectTree';
import type { RecentMockup } from '@/components/ProjectTree/RecentsSection';
import { type AuthMe, IdentityContext, useRequireAuth } from '@/lib/hooks/use-require-auth';
import styles from './projects/layout.module.css';
import { ProjectSidebar } from './projects/ProjectSidebar';

interface ShellPayload {
  identity: { kind: 'user' | 'agent'; name?: string; email?: string };
  projects: TreeProject[];
  orphanMockups: TreeMockup[];
  mockupNames: Record<string, string>;
  recentMockups: Record<string, RecentMockup>;
  sidebarCollapsed: boolean;
}

/**
 * Client shell — auth-gates via `useRequireAuth()` and fetches the
 * sidebar payload from `GET /api/shell`. Children render only once the
 * shell payload is available so the sidebar tree is consistent on the
 * first interactive frame. The shell publishes the resolved identity
 * through `IdentityContext` so descendants don't re-call `/api/auth/me`.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { identity, loading: authLoading } = useRequireAuth();
  const [shell, setShell] = useState<ShellPayload | null>(null);
  const [shellError, setShellError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (authLoading || !identity) return;
    fetch('/api/shell', { credentials: 'include' })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          window.location.replace('/login');
          return;
        }
        if (!res.ok) {
          setShellError(`http_${res.status}`);
          return;
        }
        const json: ShellPayload = await res.json();
        if (!cancelled) setShell(json);
      })
      .catch((e) => {
        if (!cancelled) setShellError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, identity]);

  if (authLoading || !identity || !shell) {
    return (
      <div
        className={styles.shell}
        aria-busy="true"
        style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}
      >
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--type-sm)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {shellError ? `Failed to load (${shellError})` : 'Loading…'}
        </span>
      </div>
    );
  }

  // Prefer the shell payload's name/email (it falls back to the user
  // row), but keep the identity `kind` and `id` from the auth check.
  const shellIdentity: AuthMe = {
    kind: shell.identity.kind,
    id: identity.id,
    name: shell.identity.name ?? identity.name,
    email: shell.identity.email ?? identity.email,
  };

  return (
    <IdentityContext.Provider value={shellIdentity}>
      <div className={styles.shell}>
        <ProjectSidebar
          projects={shell.projects}
          orphanMockups={shell.orphanMockups}
          mockupNames={shell.mockupNames}
          recentMockups={shell.recentMockups}
          defaultCollapsed={shell.sidebarCollapsed}
        />
        <main className={styles.main}>{children}</main>
        <CommandPalette projects={shell.projects} />
      </div>
    </IdentityContext.Provider>
  );
}
