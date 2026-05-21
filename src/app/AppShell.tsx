'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CommandPalette } from '@/components/CommandPalette/CommandPalette';
import { useNewMockupDialog } from '@/components/NewMockupDialog';
import type { TreeMockup, TreeProject } from '@/components/ProjectTree/ProjectTree';
import type { RecentMockup } from '@/components/ProjectTree/RecentsSection';
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
 * sidebar payload from `GET /api/shell`. The shell scaffold (sidebar
 * + topbar + main slot) renders from the first paint so the user
 * never sees an empty screen during the cold start. While the
 * `/api/shell` payload is in flight, the sidebar shows skeleton tree
 * rows inside the real scaffold (logo, collapse, footer all stay
 * real); the topbar paints its real surface (breadcrumbs derived from
 * the URL); pages render their own per-route skeleton in the main
 * slot. The shell publishes the resolved identity through
 * `IdentityContext` so descendants don't re-call `/api/auth/me`.
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

  // Breadcrumb is derived from the URL + the already-loaded shell so
  // navigation updates the trail instantly — no page-level resolver
  // round-trip needed before the breadcrumb refreshes. Gracefully
  // degrades to an empty trail when the shell is still loading.
  const breadcrumbs = useMemo(
    () =>
      buildBreadcrumbsFromPath({
        pathname,
        projects: shell?.projects ?? [],
        recentMockups: shell?.recentMockups ?? {},
      }),
    [pathname, shell?.projects, shell?.recentMockups],
  );

  // Identity for the topbar: prefer the shell payload (richer name /
  // email) but fall back to the auth-me response while shell is in
  // flight so the topbar avatar paints with the user's initial right
  // after auth resolves.
  const shellIdentity: AuthMe | null = identity
    ? {
        kind: shell?.identity.kind ?? identity.kind,
        id: identity.id,
        name: shell?.identity.name ?? identity.name,
        email: shell?.identity.email ?? identity.email,
        role: shell?.identity.role ?? identity.role,
      }
    : null;

  return (
    <IdentityContext.Provider value={shellIdentity}>
      <ShellRefreshContext.Provider value={refreshShell}>
        <div className={styles.shell}>
          <ProjectSidebar
            projects={shell?.projects ?? []}
            orphanMockups={shell?.orphanMockups ?? []}
            mockupNames={shell?.mockupNames ?? {}}
            recentMockups={shell?.recentMockups ?? {}}
            defaultCollapsed={shell?.sidebarCollapsed ?? false}
            onUploadFile={handleSidebarUpload}
            loading={!shell}
          />
          <div className={styles.rightCol}>
            <Topbar
              breadcrumbs={breadcrumbs}
              userName={shellIdentity?.name}
              userEmail={shellIdentity?.email}
              userRole={shellIdentity?.role}
            />
            <main className={styles.main}>
              {shellError ? (
                <div
                  aria-busy="true"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    minHeight: '50dvh',
                    color: 'var(--text-muted)',
                    fontSize: 'var(--type-sm)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Failed to load ({shellError})
                </div>
              ) : (
                children
              )}
            </main>
          </div>
          <CommandPalette projects={shell?.projects ?? []} />
        </div>
      </ShellRefreshContext.Provider>
    </IdentityContext.Provider>
  );
}
