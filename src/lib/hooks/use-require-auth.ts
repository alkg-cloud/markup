'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface AuthMe {
  kind: 'user' | 'agent';
  id?: string;
  name?: string;
  email?: string;
}

/**
 * Client-side auth guard. Runs once per mount, calls `GET /api/auth/me`,
 * and redirects to `/login` on 401. Middleware (`src/middleware.ts`)
 * handles the cheap "no cookie" case before any React mounts; this hook
 * catches the rarer "cookie exists but session is invalid / expired"
 * case where middleware lets the request through.
 *
 * Returns `{ identity, loading }`. While `loading` is true, callers
 * should render a skeleton — the identity is unresolved.
 */
export function useRequireAuth(): { identity: AuthMe | null; loading: boolean } {
  const router = useRouter();
  const [identity, setIdentity] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const json: AuthMe = await res.json();
        if (cancelled) return;
        setIdentity(json);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { identity, loading };
}
