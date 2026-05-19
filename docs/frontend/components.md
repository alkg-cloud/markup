# Components

## Client-side rendering only

Markup renders **exclusively on the client**. Every `page.tsx`, every `layout.tsx`, and every shell component starts with `'use client'`. Server components are forbidden for UI — see [CLAUDE.md → Client-side rendering rule](../../CLAUDE.md#client-side-rendering-rule-strict--non-negotiable).

The split is:

- **Pages + layouts + shell**: client components. They own loading + error states and fetch their data via `fetch('/api/…')`.
- **API routes** under `src/app/api/**`: server-side, `force-dynamic`, read Prisma / cookies / DATA_DIR. Not part of the UI render path.
- **Root `src/app/layout.tsx`**: the single server-rendered file. It only sets up `<html>`, fonts, and metadata; it does NOT fetch data. The `<body>` mounts a `ClientRoot` (`'use client'`) that owns global providers (Toast, Tooltip portal) and the route tree.

```
src/app/layout.tsx        ← server (HTML shell + fonts only)
  <ClientRoot>            ← 'use client'  — providers + children
    page.tsx              ← 'use client'  — fetch + render
```

## Data-fetching pattern

Pages own their data via a client-side `fetch`:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MockupPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ViewerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/mockups/${id}/viewer`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => { if (!cancelled) setData(j); })
      .catch((e) => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, [id]);

  if (error) return <ErrorState code={error} />;
  if (!data) return <LoadingState />;
  return <ViewerSurface {...data} />;
}
```

See [`docs/frontend/data-fetching.md`](data-fetching.md) for the shared `useApi` hook and the `useRequireAuth` guard.

## Auth gating

Two layers:

1. **`src/middleware.ts`** — runs at the edge. Redirects unauthenticated traffic (no `mk_session` cookie) hitting any `(app)` path to `/login`. Cannot use Prisma — checks only cookie presence.
2. **Client `useRequireAuth()`** — runs in every in-shell client component. Calls `GET /api/auth/me`; on 401 it `router.replace('/login')`. This catches expired sessions where the cookie still exists but is invalid.

The combination means the URL bar is honest immediately (middleware redirects on first hit) AND the UI never renders stale-cookie state.

## File layout per shared component

Shared components live in `src/components/<ComponentName>/<ComponentName>.tsx`. The folder hosts the JSX file; tests live alongside when present.

```
src/components/
  AppNav/
    AppNav.tsx              # 'use client' — usePathname for active state
  AnnotationCanvas/
    AnnotationCanvas.tsx    # 'use client' — wraps <Tldraw>
  AnnotationModal/
    AnnotationModal.tsx     # 'use client' — modal + chip strip
  AnnotationPin/
    AnnotationPin.tsx       # 'use client' — hover/active state on the pin
  ThreadTimeline/
    ThreadTimeline.tsx        # 'use client' — reply textarea
    ThreadTimeline.module.css # header pill, message list (avatar+body+agent quote), reply form, ghost/primary buttons
  ProjectTree/
    ProjectTree.tsx         # 'use client' — ARIA tree with keyboard nav + DnD
    ProjectTree.module.css  # tree items, chevron, count badge, kebab hover-swap, accent bar, indentation
    useTreeDnD.ts           # hook — HTML5 Drag API + keyboard move mode
    InlineFolderCreate.tsx  # 'use client' — inline input for folder creation
    InlineFolderCreate.module.css  # input, error styles
    RecentsSection.tsx      # 'use client' — useRecents hook + recent-item list with icon/info/timestamp
    RecentsSection.module.css  # header label styles
    RecentList.module.css   # list, item, icon, info, name, path, time styles
  Breadcrumbs/
    Breadcrumbs.tsx         # 'use client' — breadcrumb nav with truncation
    Breadcrumbs.module.css  # nav, list, link, separator, current styles
  CommandPalette/
    CommandPalette.tsx         # 'use client' — Ctrl+K overlay with search + keyboard nav
    CommandPalette.module.css  # glassmorphism panel, scrim, animations
    flatten.ts                 # pure util — ProjectTree[] → FlatSearchItem[]
    filter.ts                  # pure util — filter + group by type
  Topbar/
    Topbar.tsx              # 'use client' — 52px topbar with search pill + avatar + breadcrumb
    Topbar.module.css       # topbar, searchPill, avatarBtn styles
  FolderCard/
    FolderCard.tsx          # 'use client' — folder card with CSS Modules (Link + SVG icon)
    FolderCard.module.css   # card, icon, info, name, meta styles
  ProjectCard/
    ProjectCard.tsx         # 'use client' — project tile for the all-projects grid (Link + resolved icon + kebab popover)
    ProjectCard.module.css  # card, icon, info, name, meta, kebab, popover styles
  EmptyState/
    EmptyState.tsx          # 'use client' — project/folder empty states
    EmptyState.module.css   # container, icon, title, desc, actions, btn-accent, btn-secondary styles
  Sidebar/
    Sidebar.tsx              # 'use client' — pill-morph sidebar shell with collapse toggle
    Sidebar.module.css       # phased morph transitions
  Dropdown/
    Dropdown.tsx            # 'use client' — positioned popover menu with items, divider, danger variant
    Dropdown.module.css     # menu, item, itemDanger, divider styles + spring animation
  Dialog/
    Dialog.tsx              # 'use client' — modal dialog with scrim, title, field/input helpers, actions row
    Dialog.module.css       # scrim, dialog card, title, field, label, input, actions styles + scale-in animation
  Toast/
    useToast.ts             # 'use client' — ToastProvider (context + reducer) + useToast() hook; show(message, duration?)
    Toast.tsx               # re-exports ToastProvider + useToast
    Toast.module.css        # fixed bottom-center container, pill shape, in/out animations, prefers-reduced-motion override
  IconPicker/
    IconPicker.tsx          # 'use client' — tabbed icon picker (Code/Brands/UI/Emoji) with search and selection
    IconPicker.module.css   # popover, tabs, search row, 8-column grid, cell hover/selected, footer mono styles
    icons.ts                # PICKER_ICONS data map + filterIcons() pure utility
  NewProjectDialog/
    NewProjectDialog.tsx    # 'use client' — dialog with project name input + IconPicker; calls POST /api/projects on submit
    NewProjectDialog.module.css  # btn-secondary, btn-accent styles
```

All authenticated, in-shell pages live under the `(app)` route group. The group's `layout.tsx` is a client component that mounts `AppShell` once for every child route, so the sidebar tree and any other client state inside the shell survive navigation between in-shell pages without remount. Full-page surfaces (`/login`, `/setup`, the side-by-side diff view) live outside the group and render without a shell.

Page-scoped components (used only by one page) live next to the page file:

```
src/app/
  layout.tsx                 # server — root HTML shell, fonts, metadata (no data fetch)
  ClientRoot.tsx             # 'use client' — Toast/Tooltip providers, mounted under <body>
  AppShell.tsx               # 'use client' — auth guard + API fetch of tree → sidebar/topbar shell
  (app)/
    layout.tsx               # 'use client' — wraps every in-shell child in <AppShell>
    page.tsx                 # 'use client' — `all-projects` landing: fetches /api/projects, renders the project-card grid + "New project" CTA
    AllProjectsPage.tsx      # 'use client' — page-scoped component owning grid, kebab handlers, dialogs (page.tsx is the data-fetch shell)
    projects/
      page.tsx               # 'use client' — thin redirect to `/` (kept so external bookmarks to `/projects` still resolve)
    mockups/
      [id]/
        page.tsx             # 'use client' — fetches /api/mockups/[id]/viewer
        MockupViewer.tsx     # 'use client' — iframe + pin overlay
        Versions.tsx         # 'use client' — sidebar version list
    annotations/
      [id]/
        page.tsx             # 'use client' — fetches /api/annotations/[id]/detail
        ReadOnlyAnnotation.tsx  # 'use client' — read-only canvas
    settings/
      agents/
        page.tsx             # 'use client' — fetches /api/agent-tokens
        AgentsClient.tsx     # 'use client' — list + create + revoke UI
  mockups/
    page.tsx                 # 'use client' — redirects /mockups to `/`
    [id]/
      diff/
        page.tsx             # 'use client' — fetches /api/mockups/[id]/diff-versions
        DiffViewer.tsx       # 'use client' — side-by-side iframes
  projects/
    ProjectSidebar.tsx       # 'use client' — sidebar wrapper used by AppShell
    ProjectSidebar.module.css
    layout.module.css        # responsive grid: sidebar + main on desktop, single column on mobile <768px
    [slug]/
      page.tsx               # 'use client' — fetches /api/projects/[slug]/view
      ProjectContent.tsx     # 'use client' — unified folder/mockup card grid
      [...path]/
        page.tsx             # 'use client' — fetches /api/projects/[slug]/resolve?path=…
  login/                     # full-page, no shell (still client)
  setup/                     # full-page, no shell (still client)
```

The page-scoped pattern means `MockupViewer.tsx` is co-located with its `page.tsx` under `(app)/mockups/[id]/`. This keeps the import surface obvious and prevents `src/components/` from accumulating one-off pieces.

`AppShell.tsx` lives directly under `src/app/` (not inside `(app)/`) because the route-group layout imports it via a relative path.

## Copy / i18n

The UI ships in **English**. All visible labels, aria attributes, button copy, section headers, and toast messages are written in EN. The product is not localised — every translated string is a bug.

When adding a new surface, write the strings in EN directly in JSX (no `t()` helper, no locale map). Pre-existing PT-BR text in any new PR must be translated as part of the change.

## Composition rules

- **Pages are client components** that fetch data via `fetch('/api/…')` in `useEffect` and render loading / error / success states. They do not import Prisma; they do not call `identify()`.
- **Client islands receive plain data** — never functions or Prisma rows. Servers return ISO-string dates; clients render them.
- **Effects run twice in dev** (React Strict Mode). Anything that mutates state (creating a tldraw asset, fetching) must be idempotent. See [tldraw](tldraw.md#strictmode-dedup). For pages, the `useEffect` cleanup MUST set a `cancelled` flag so a fast unmount doesn't write to a dead component.
- **Refs** for imperative APIs (e.g. tldraw's `editor` instance) live in the client island, exposed via an `onMount` callback to a sibling control:

```tsx
const editorRef = useRef<Editor | null>(null);
<AnnotationCanvas onEditorMount={(ed) => { editorRef.current = ed; }} />
```

## Styling: CSS Modules + tokens

New components use **CSS Modules** (`.module.css` co-located with the `.tsx` file). Existing components migrate to CSS Modules when touched. Untouched components keep their inline `style={{…}}` until a PR touches them. Global rules (focus-visible, scrollbar, `body::before` mesh) live in `src/app/globals.css`.

```tsx
// New component pattern
import styles from './CommandPalette.module.css';

<div className={styles.panel}>…</div>
```

```css
/* CommandPalette.module.css */
.panel {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popover);
}
```

Legacy inline style pattern (existing components not yet migrated):

```tsx
<button style={{
  padding: '8px 16px',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--btn-bg)',
  color: 'var(--accent-on-btn)',
  fontWeight: 700,
  fontSize: 'var(--type-sm)',
}}>
```

All values reference tokens via `var(--…)`. If a value isn't a token, the token is missing — add it to `tokens.css` first. No styled-components, no Tailwind.

## State coverage per interactive element

Every interactive element ships **hover + focus-visible + active** treatments:

```tsx
const [hovered, setHovered] = useState(false);
const [pressed, setPressed] = useState(false);

<button
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => { setHovered(false); setPressed(false); }}
  onMouseDown={() => setPressed(true)}
  onMouseUp={() => setPressed(false)}
  style={{
    transform: pressed ? 'translateY(1px)' : hovered ? 'translateY(-1px)' : 'none',
    transition: 'transform var(--motion-fast) var(--ease-standard)',
  }}
>
```

For elements that already have CSS pseudo-class support and don't need JS state, prefer pure CSS via the global rule:

```css
:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
```

## Accessibility

- Every interactive element has either a default tabIndex or `tabIndex={0}`
- Use semantic elements (`<button>`, `<a>`, `<input>`) over generic `<div>`s with `role="button"`. When a custom element is necessary (chip selector with custom styling), add an inline biome-ignore directive on the JSX line:

```tsx
{/* biome-ignore lint/a11y/useSemanticElements: chip selector — custom styled */}
<button type="button" role="radio" aria-checked={active}>
```

- Annotation pins host the focus ring on the OUTER `<a>` element (axis-aligned), and the rotated `-45deg` decoration on a child `<span>` — see `src/components/AnnotationPin/AnnotationPin.tsx`. Rotating the focusable element rotates the focus ring with it, breaking the visual cue.

## Forms

There is no form library. Inputs are uncontrolled or controlled with `useState` directly; submit handlers call `fetch` and read `res.ok`. For forms with non-trivial validation (registration, mockup metadata), the validation lives on the server side via Zod in the route handler — the client surfaces the error from the response body.

## Animation

- Transitions use `var(--motion-fast)` (160ms), `var(--motion-base)` (220ms), `var(--motion-slow)` (320ms) with `var(--ease-standard)` or `var(--ease-spring)`
- New `@keyframes` rules ship with a matching `@media (prefers-reduced-motion: reduce)` override that zeros the animation
- Tldraw owns its own animations; we don't try to override them
