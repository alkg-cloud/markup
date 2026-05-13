# Frontend

The UI is a Next.js App Router app rendered as a mix of server components (default) and client components (when interactivity is needed). There is no separate frontend app — pages, server logic, and API routes share the same `src/` tree.

## Read first

- [Components](components.md) — server vs client, file layout, composition rules
- [Styling](styling.md) — `tokens.css`, OKLCH palette, `:focus-visible` global rule, `prefers-reduced-motion`
- [Tldraw integration](tldraw.md) — snapshot model, base64 strip, StrictMode dedup, edit mode

## Pages

| Path | Server / Client | Purpose |
|---|---|---|
| `/` | server | Redirect to `/mockups` if logged in, else `/login` |
| `/setup` | server + `Form.tsx` client | First-run admin creation |
| `/login` | server + `Form.tsx` client | Email + password auth |
| `/mockups` | server | List grid with `MockupCard` (server-rendered with image fallback) |
| `/mockups/[id]` | server + `MockupViewer.tsx` client | Iframe + annotation pin overlay + sidebar |
| `/mockups/[id]/diff` | server + `DiffViewer.tsx` client | Side-by-side / overlay version compare |
| `/annotations/[id]` | server + `ReadOnlyAnnotation.tsx` client | Drawing canvas + thread |
| `/settings/agents` | server + `AgentsClient.tsx` client | List + create + revoke agent tokens |

The naming convention is **`page.tsx` is a server component**, **`*Client.tsx` or `<Surface>Form.tsx` is the client island**. The server component fetches data and renders the static skeleton; the client component handles state and DOM interaction.

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

- **Server components** read from Prisma directly (e.g. `prisma.mockup.findUnique`) — no fetch loopback
- **Client components** receive serialised data as props from the server component, plus an `annotationId` / `mockupId` for callbacks
- **Mutations** go through `fetch('/api/...', { method: 'POST', body: ... })`. There is no client-side router cache invalidation library; pages re-render on `router.refresh()` or full navigation
