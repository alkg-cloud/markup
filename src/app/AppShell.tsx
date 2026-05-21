'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CommandPalette } from '@/components/CommandPalette/CommandPalette';
import { FadeIn } from '@/components/FadeIn';
import { useNewMockupDialog } from '@/components/NewMockupDialog';
import type { TreeMockup, TreeProject } from '@/components/ProjectTree/ProjectTree';
import type { RecentMockup } from '@/components/ProjectTree/RecentsSection';
import { ShellSkeleton } from '@/components/Skeleton/ShellSkeleton';
import { Topbar } from '@/components/Topbar/Topbar';
import { buildBreadcrumbsFromPath } from '@/lib/breadcrumbs/from-path';
import { type AuthMe, IdentityContext, useRequireAuth } from '@/lib/hooks/use-require-auth';
import { ShellRefreshContext } from '@/lib/hooks/use-shell-refresh';
import { resolveTargetFromPath } from '@/lib/upload/resolve-target';
import styles from './projects/layout.module.css';
import { ProjectSidebar } from './projects/ProjectSidebar';

interface ShellPayload {
  identity: { kind: 'user' | 'agent'; name?: string; email?: string; role?: 'admin' | 'member' };
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
  // Bumping this triggers the fetch effect; consumers (sidebar rename /
  // move / delete handlers) call `refreshShell()` from
  // `useShellRefresh()` to keep the cached payload in sync after a
  // mutation.
  const [refreshTick, setRefreshTick] = useState(0);
  const refreshShell = useCallback(() => setRefreshTick((t) => t + 1), []);
  // Footer "New mockup" button: pop the upload dialog with the picked
  // file. The provider lives at `(app)/layout.tsx` so this hook always
  // resolves; we re-resolve the current route's target here (mirroring
  // the layout's URL-only resolver) so the dialog prefills project /
  // folder consistently with a drag-drop on the same view.
  const { openDialog } = useNewMockupDialog();
  const pathname = usePathname();
  const handleSidebarUpload = (file: File) => {
    openDialog({ file, target: resolveTargetFromPath(pathname) });
  };

  useEffect(() => {
    if (authLoading || !identity) return;
    const controller = new AbortController();
    fetch('/api/shell', { credentials: 'include', signal: controller.signal })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.replace('/login');
          return;
        }
        if (!res.ok) {
          setShellError(`http_${res.status}`);
          return;
        }
        const json: ShellPayload = await res.json();
        setShell(json);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setShellError(String(e));
      });
    return () => controller.abort();
  }, [authLoading, identity, refreshTick]);

  if (authLoading || !identity || !shell) {
    if (shellError) {
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
            Failed to load ({shellError})
          </span>
        </div>
      );
    }
    return <ShellSkeleton />;
  }

  // Breadcrumb is derived from the URL + the already-loaded shell so
  // navigation updates the trail instantly — no page-level resolver
  // round-trip needed before the breadcrumb refreshes.
  const breadcrumbs = useMemo(
    () =>
      buildBreadcrumbsFromPath({
        pathname,
        projects: shell.projects,
        recentMockups: shell.recentMockups,
      }),
    [pathname, shell.projects, shell.recentMockups],
  );

  // Prefer the shell payload's name/email (it falls back to the user
  // row), but keep the identity `kind` and `id` from the auth check.
  const shellIdentity: AuthMe = {
    kind: shell.identity.kind,
    id: identity.id,
    name: shell.identity.name ?? identity.name,
    email: shell.identity.email ?? identity.email,
    role: shell.identity.role ?? identity.role,
  };

  return (
    <IdentityContext.Provider value={shellIdentity}>
      <ShellRefreshContext.Provider value={refreshShell}>
        <FadeIn className={styles.shell}>
          <ProjectSidebar
            projects={shell.projects}
            orphanMockups={shell.orphanMockups}
            mockupNames={shell.mockupNames}
            recentMockups={shell.recentMockups}
            defaultCollapsed={shell.sidebarCollapsed}
            onUploadFile={handleSidebarUpload}
          />
          <div className={styles.rightCol}>
            <Topbar
              breadcrumbs={breadcrumbs}
              userName={shellIdentity.name}
              userEmail={shellIdentity.email}
              userRole={shellIdentity.role}
            />
            <main className={styles.main}>{children}</main>
          </div>
          <CommandPalette projects={shell.projects} />
        </FadeIn>
      </ShellRefreshContext.Provider>
    </IdentityContext.Provider>
  );
}
