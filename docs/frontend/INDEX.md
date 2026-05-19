# Frontend

The UI is a Next.js App Router app rendered **exclusively on the client**. Every page, layout, and shell is a client component (`'use client'`). Server-side rendering is forbidden — see [CLAUDE.md → Client-side rendering rule](../../CLAUDE.md#client-side-rendering-rule-strict--non-negotiable).

The HTML response Next serves for any page route is a minimal shell that boots the React app; pages own their own data via `fetch('/api/…')` against the server-side route handlers in `src/app/api/**`.

## Read first

- [Components](components.md) — server vs client split (root `layout.tsx` only), file layout, composition rules
- [Data fetching](data-fetching.md) — `useApi`, `useRequireAuth`, loading + error patterns
- [Styling](styling.md) — `tokens.css`, OKLCH palette, `:focus-visible` global rule, `prefers-reduced-motion`
- [Tldraw integration](tldraw.md) — snapshot model, base64 strip, StrictMode dedup, edit mode

## Pages

Every page is a client component that fetches its data via `fetch('/api/…')`. The naming is `page.tsx` for the route, with co-located sub-components (`*Client.tsx`, `*Form.tsx`, `*Viewer.tsx`) when the page splits into pieces.

| Path | Aggregator API | Purpose |
|---|---|---|
| `/` | redirect to `/projects` | Root redirect |
| `/setup` | `GET /api/auth/setup-status` + `POST /api/auth/setup` | First-run admin creation |
| `/login` | `GET /api/auth/setup-status` + `POST /api/auth/login` | Email + password auth |
| `/projects` | `GET /api/projects` | Redirect to first project (placeholder home) |
| `/projects/[slug]` | `GET /api/projects/[slug]/view` | Project root workspace |
| `/projects/[slug]/[...path]` | `GET /api/projects/[slug]/resolve?path=…` | Folder or mockup viewer (resolved server-side) |
| `/mockups/[id]` (legacy) | redirect to `/projects` | Backwards-compat redirect |
| `/mockups/[id]/diff` | `GET /api/mockups/[id]/diff-versions?from=&to=` | Side-by-side / overlay version compare |
| `/annotations/[id]` | `GET /api/annotations/[id]/detail` | Drawing canvas + thread |
| `/settings/agents` | `GET /api/agent-tokens` | List + create + revoke agent tokens inside the standard sidebar + topbar shell |

The route group `(app)` mounts `AppShell` once (via `(app)/layout.tsx`) so the sidebar tree and other client state inside it survive in-shell navigations. Full-page surfaces (`/login`, `/setup`, `/mockups/[id]/diff`) render outside `(app)`.

`AppShell` itself fetches `GET /api/shell` on mount — a single aggregator that returns the viewer's identity (name/email), the sidebar tree, the recents map, and the persisted sidebar-collapsed flag.

## Shared components

| Component | File | Purpose |
|---|---|---|
| `AppNav` | `src/components/AppNav/AppNav.tsx` | Top-right "Mockups | Agents" pills with active state via `usePathname()` |
| `AnnotationModal` | `src/components/AnnotationModal/AnnotationModal.tsx` | "+ Comment" modal with tldraw canvas + chip strip + textarea |
| `AnnotationCanvas` | `src/components/AnnotationCanvas/AnnotationCanvas.tsx` | Tldraw wrapper — handles screenshot bg, edit mode, StrictMode dedup |
| `AnnotationPin` | `src/components/AnnotationPin/AnnotationPin.tsx` | Numbered teardrop pin overlaid on iframe coordinates |
| `ThreadTimeline` | `src/components/ThreadTimeline/ThreadTimeline.tsx` | Message list with avatar chips and reply textarea |
| `ToastProvider` | `src/components/Toast/Toast.tsx` | Root-level toast notification provider; `useToast()` hook for success/error/warning/info |

## Image strategy

- Mockup card thumbnails are served from `/api/mockups/[id]/thumbnail`. The route serves the file when ≥ 64 bytes and a valid PNG; smaller / corrupt files trigger a 404 and the card falls back to a deterministic monogram (palette-cycled hue from a 6-entry list keyed off the mockup id)
- Annotation screenshots come from `/api/annotations/[id]/screenshot` — full PNG, no transformation
- Bbox-cropped screenshots come from `/api/annotations/[id]/region` — see [`docs/agent-loop/endpoints.md`](../agent-loop/endpoints.md)

## State ownership

- **Pages** own a `useState` for the fetched payload + a `useState` for the error code. The fetch runs in `useEffect` with a `cancelled` flag for unmount safety.
- **Mutations** go through `fetch('/api/...', { method: 'POST', body: ... })`. After a mutation, the page re-fetches its aggregator (or calls a hook that owns the cache). There is no client-side router cache invalidation library; `router.refresh()` is a no-op for client-rendered pages — pages manage their own staleness.
- **Auth gating** is a combination of middleware (cookie-presence redirect at the edge) and `useRequireAuth()` (401 → `router.replace('/login')`). See [data fetching](data-fetching.md).
