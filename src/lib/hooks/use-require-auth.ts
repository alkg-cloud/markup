'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';

export interface AuthMe {
  kind: 'user' | 'agent';
  id?: string;
  name?: string;
  email?: string;
}

/**
 * Shell-mounted identity context. `AppShell` populates it once after
 * `GET /api/shell` resolves so descendants can read identity blurb
 * (name/email for the topbar) without re-calling `/api/auth/me`.
 *
 * `null` means "no shell mounted" — pages outside `(app)` (login,
 * setup, diff) should call `useRequireAuth()` directly.
 */
export const IdentityContext = createContext<AuthMe | null>(null);

/** Read the shell-provided identity. Returns `null` outside the shell. */
export function useIdentity(): AuthMe | null {
  return useContext(IdentityContext);
}

/**
 * Client-side auth guard. Runs once per mount, calls `GET /api/auth/me`,
 * and redirects to `/login` on 401. The proxy (`src/proxy.ts`) handles
 * the cheap "no cookie" case before any React mounts; this hook catches
 * the rarer "cookie exists but session is invalid / expired" case where
 * the proxy lets the request through.
 *
 * Returns `{ identity, loading }`. While `loading` is true, callers
 * should render a skeleton — the identity is unresolved.
 */
export function useRequireAuth(): { identity: AuthMe | null; loading: boolean } {
  const router = useRouter();
  const [identity, setIdentity] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/me', { credentials: 'include', signal: controller.signal })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const json: AuthMe = await res.json();
        setIdentity(json);
        setLoading(false);
      })
      .catch((e) => {
        // Aborts are the normal teardown path — ignore them so the
        // unmounted component doesn't flip into an error state.
        if (e?.name === 'AbortError') return;
        setLoading(false);
      });
    return () => controller.abort();
  }, [router]);

  return { identity, loading };
}
