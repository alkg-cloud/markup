# Data fetching

Pages render exclusively on the client and own their own data. There is no SWR / React Query — we use plain `fetch` inside `useEffect` and a couple of small hooks that codify the pattern.

## The pattern

Every page-level fetch follows this shape:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface ViewerPayload { /* … */ }

export default function MockupPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ViewerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/mockups/${id}/viewer`, { credentials: 'include' })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          window.location.replace('/login');
          return;
        }
        if (!res.ok) throw new Error(`http_${res.status}`);
        const json: ViewerPayload = await res.json();
        if (!cancelled) setData(json);
      })
      .catch((e) => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, [id]);

  if (error) return <ErrorState code={error} />;
  if (!data) return <LoadingState />;
  return <ViewerSurface {...data} />;
}
```

Four invariants:

1. **`'use client'`** at the top.
2. **`cancelled` flag** in the `useEffect` cleanup. React Strict Mode runs effects twice in dev; without the flag the first run can write to a dead component when the second run finishes first.
3. **`credentials: 'include'`** — fetch is same-origin so the cookie rides along automatically, but stating it documents intent (the Bearer-auth path is for non-browser agents).
4. **401 → redirect to `/login`** — the server's source of truth for auth is `/api/auth/me`. Any data endpoint that returns 401 means the cookie is gone or expired; the only sane response is to send the user to `/login`.

## `useRequireAuth()`

The in-shell layout calls `useRequireAuth()` exactly once. The hook lives in `src/lib/hooks/use-require-auth.ts` and:

1. Calls `GET /api/auth/me`.
2. On 401, `router.replace('/login')`.
3. On success, exposes `{ identity, loading }` so the shell can render `<LoadingState />` until the identity is known.

Middleware in `src/middleware.ts` runs first at the edge — it redirects on missing `mk_session` cookie before any React mounts. The hook catches the rarer "cookie exists but session is invalid/expired" case, where middleware passes the request through but `/api/auth/me` returns 401.

```ts
// src/lib/hooks/use-require-auth.ts
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface AuthMe {
  kind: 'user' | 'agent';
  id?: string;
  name?: string;
  email?: string;
}

export function useRequireAuth() {
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
        if (!cancelled) {
          setIdentity(json);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  return { identity, loading };
}
```

## Mutations

`fetch` for POST/PATCH/DELETE follows the same pattern. After a successful mutation the caller refetches its page-level aggregator (calling the same setter the initial load used). There is no global cache library.

```tsx
async function onSubmit() {
  const res = await fetch(`/api/projects/${projectId}/folders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, parentId }),
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'unknown_error');
  }
  await reloadShell(); // pull the new tree from /api/shell
}
```

## Aggregator endpoints

Pages that need a dense payload (viewer, annotation detail) call a single aggregator endpoint that returns everything the page needs. The aggregators live under `src/app/api/**`:

| Aggregator | Used by | Payload |
|---|---|---|
| `GET /api/auth/me` | every in-shell page (via `useRequireAuth`) | identity + user blurb |
| `GET /api/auth/setup-status` | `/login`, `/setup` | `{ completed: boolean }` |
| `GET /api/shell` | `AppShell` | tree + recents + identity blurb + sidebar-collapsed flag |
| `GET /api/projects/[slug]/view` | `/projects/[slug]` | project metadata + root folders + root mockups |
| `GET /api/projects/[slug]/resolve?path=…` | `/projects/[slug]/[...path]` | resolved folder OR mockup + breadcrumb data |
| `GET /api/mockups/[id]/viewer` | `/projects/[slug]/.../<mockup>` | mockup + versions + annotations + thread tree + resolved display names |
| `GET /api/annotations/[id]/detail` | `/annotations/[id]` | annotation + screenshot dims + tldraw JSON + thread + resolved names + mockup blurb + viewerHref |
| `GET /api/mockups/[id]/diff-versions?from=&to=` | `/mockups/[id]/diff` | resolved from/to version pair + viewerHref |

These endpoints replace the heavy data transformation that used to happen inside server components. The same shape is returned as JSON now; pages call it via `fetch` and render the result.

## Why not SWR / React Query?

The product is single-tenant, the data graph is shallow, and most pages need exactly one fetch on mount + targeted refetch on mutation. A library would add a dependency for caching we don't need. If the navigation pattern ever grows to "many small overlapping fetches that share data" we revisit; until then, hand-rolled `useEffect` keeps the surface explicit.
