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
  if (!data) return <ProjectSkeleton />;
  return (
    <FadeIn>
      <ViewerSurface {...data} />
    </FadeIn>
  );
}
```

See [`docs/frontend/data-fetching.md`](data-fetching.md) for the shared `useApi` hook and the `useRequireAuth` guard.

## Loading states

**Every loading state in the app MUST render a skeleton.** Bare "Loading…" text, blank screens, and standalone spinners are forbidden — they leave the layout shifting and the user staring at empty pixels on every cold start.

**The structural shell (sidebar logo, collapse button, PROJECTS / NO PROJECT section headers, footer "New mockup" button, and topbar with breadcrumbs + avatar) is NEVER skeletoned.** Those elements paint immediately because they are derived from the URL + auth-me response, not from `/api/shell`. The skeleton only replaces the variable parts: sidebar tree rows, page content cards, the home hero's "N mockups updated since yesterday" count.

The visual contract is documented in [DS 31 — Skeleton](../design/design-system/31-skeleton.html). The skeleton primitives live in [`src/components/Skeleton/`](../../src/components/Skeleton):

- `<Skeleton />` — single rectangle with shimmer (`block` / `text` / `circle` variants). Use it to compose ad-hoc placeholders.
- `<SidebarTreeSkeleton />` — placeholder tree rows mounted inside the real `<Sidebar>` while `/api/shell` is in flight. Brand, collapse, footer, and section labels stay real.
- `<HomeSkeleton />` — workspace landing skeleton. Renders the real `HomeHero` greeting + date (locally derived) with a mini text skeleton in place of the unknown "N mockups updated since yesterday" count, plus skeleton card grids for Recents, Projects, and No-project sections.
- `<ProjectSkeleton />` — header + card grid shared by `/projects/[slug]`, the catch-all (`/projects/[slug]/[...path]`), and the mockup viewer's pre-data state. A single skeleton across the three branches keeps the load feeling smooth even when the URL can't disambiguate them upfront.

Rules of thumb:

1. **Mirror the post-load layout where you can.** A skeleton that doesn't match the real layout produces a visible "jump" when the content arrives. Compose new skeletons from `<Skeleton />` to reach pixel parity with the destination surface. (The project/folder/mockup unification accepts a small mismatch since the alternative — swapping between two different placeholders mid-load — feels worse.)
2. **Wrap the real content in `<FadeIn>`** so the swap from skeleton → content is a 360 ms ease-out-expo cross-fade + 6 px slide-up, not a hard cut. Importing it costs nothing (`src/components/FadeIn/FadeIn.tsx` is a few dozen bytes). DS 31 § Anatomy documents the exact values.
3. **Don't FadeIn the skeleton itself.** The skeleton is the first paint — fading it in just delays feedback. FadeIn wraps only the resolved content branch.
4. **Respect `prefers-reduced-motion`.** Both the shimmer animation and the fade-in are zeroed under the media query — no opt-in needed; the primitives already do it.
5. **Don't render the skeleton inside a Suspense boundary that flickers.** If the data source is fast (< 100 ms) the skeleton-then-content swap is itself noise; in that case render nothing while loading and rely on the parent's skeleton for the cold-start case.

The reference page-level pattern:

```tsx
if (status === 'loading' || !data) {
  return <ProjectSkeleton />;        // matches the destination layout
}

return (
  <FadeIn>
    <ProjectContent {...data} />     // real content fades in over 360 ms
  </FadeIn>
);
```

A new page-level surface (e.g. settings sub-page, agent log viewer) that doesn't fit an existing skeleton MUST ship its own composed skeleton in `src/components/Skeleton/<Name>Skeleton.tsx` alongside the page — don't fall back to `<LoadingState />` (kept only for legacy callers being migrated).

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
    RadixDialog.tsx         # 'use client' — Radix-Dialog compound (Root/Trigger/Portal/Overlay/Content/Title/Description/Close); Content accepts showCloseButton + closeLabel + closeButtonDisabled to surface the canonical top-right X (see docs/design/design-system/14-dialog.html)
    RadixDialog.module.css  # scrim, dialog card, title, description, scale-in animation (ported from the legacy Dialog primitive); closeBtn for the opt-in X affordance
  InputField/
    InputField.tsx          # 'use client' — Radix-Form compound (Root/Label/Control/Message/Help) with `data-state="error"|"success"` for server-driven feedback
    InputField.module.css   # field, label, input, message, help styles; hooks both [data-invalid] (Radix sync) and [data-state="error"] (consumer-set async)
  AlertBanner/
    AlertBanner.tsx         # 'use client' — inline-notice compound (Root/Icon/Body/Title/Description/Action/Close); status: error|warning|success|info
    AlertBanner.module.css  # banner, icon ring, body, action/close slots per status palette
  FolderPicker/
    FolderPicker.tsx        # 'use client' — Radix-Popover trigger with recursive folder tree; emits folder id | null ("project root")
    FolderPicker.module.css # trigger pill, popover panel, tree-row indentation, [data-state="open"] accent
  DropOverlay/
    DropOverlay.tsx         # 'use client' — Radix-Portal scrim that mirrors the current `useDragTarget()` target while a drag is over the window
    DropOverlay.module.css  # full-viewport scrim, path-preview pill, prefers-reduced-motion override
  EmptyState/
    UploadEmptyState.tsx        # 'use client' — drop-zone-gigante for empty all-projects/project/folder views; combines drop handler + visually-hidden file input
    UploadEmptyState.module.css # dropzone, label, copy, focus ring styles
  NewMockupDialog/
    NewMockupDialog.tsx          # 'use client' — composes RadixDialog (showCloseButton + closeButtonDisabled={isUploading}) + AlertBanner + InputField + FolderPicker + FileChip + PreviewBox + ReplaceToggle; runs `useUploadMockup` + `useFilePreview` + `useFolders`; resolves `target.projectSlug` → `projectId` and `target.folderPath` → `folderId` against the projects/folders that land
    NewMockupDialog.module.css   # dialog body grid, file-chip row, picker row, progress bar, actions row (close-button styles moved to RadixDialog.module.css)
    NewMockupDialogProvider.tsx  # 'use client' — context provider exposing `useNewMockupDialog().openDialog({ file, target, mode? })`; lazy-fetches the project list, mounted in (app)/layout.tsx
    FileChip.tsx / .module.css   # HTML/ZIP badge + filename pill
    PreviewBox.tsx / .module.css # mockup preview iframe with loading/ready/fallback states
    ReplaceToggle.tsx / .module.css # mode switch ("Replace" vs "Add as new mockup") when an existing mockup is targeted
    useUploadMockup.ts           # XHR-backed upload hook with progress + idle|uploading|success|error state machine
    useFilePreview.ts            # builds an inline preview URL for the dropped file; loading|ready|fallback states
    useFolders.ts                # per-project folder tree fetch keyed on `projectId`; module-level Map cache + AbortController so in-dialog project switches re-fetch (and re-flips back are free)
  CopyButton/
    CopyButton.tsx          # 'use client' — copy-to-clipboard button; 4 variants (icon/ghost/secondary/accent); custom copied/error states; icon-only always fires toast. DS source: docs/design/design-system/30-copy-button.html
    CopyButton.module.css   # .root (28×28 icon default), variant overrides, data-state="copied" (iconPop anim), data-state="error" (copyShake anim), prefers-reduced-motion
    useCopy.ts              # 'use client' — hook: copied/error boolean state + copy(value) → Promise<boolean>; delegates SR announcement to useToast
    index.ts                # re-exports CopyButton, useCopy, CopyButtonProps, UseCopyOptions, UseCopyReturn
  Kbd/
    Kbd.tsx                 # 'use client' — OS-aware keyboard-shortcut indicator; `<Kbd keys={[...]} />` for combos; `Kbd.Group` / `Kbd.Key` / `Kbd.Plus` for escape-hatch single chips. No Radix primitive. DS source: docs/design/design-system/29-kbd.html
    Kbd.module.css          # .group (inline-flex, gap 3px, disabled opacity), .key (keycap chip: bg-elevated, border, mono 10.5px/600), .plus ("+" separator, non-mac only)
    keys.ts                 # KbdKey union type + resolveKey() + announceCombo() — pure, no DOM
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
        # viewer renders via <AppMainViewerWired> → src/components/MockupViewer/; see ViewerShell section
        Versions.tsx         # 'use client' — sidebar version list
    annotations/
      [id]/
        page.tsx             # 'use client' — fetches /api/annotations/[id]/detail
        ReadOnlyAnnotation.tsx  # 'use client' — read-only screenshot view
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

The page-scoped pattern keeps single-use pieces (e.g. `DiffViewer.tsx`, `ReadOnlyAnnotation.tsx`) co-located with their `page.tsx` so `src/components/` stays the home of genuinely shared parts. The mockup viewer itself is the exception — it lives in `src/components/MockupViewer/` because the landing-page demo composes the same shell. See the next section.

## ViewerShell + AppMainShell

The mockup viewer is split in two layers so the production app and the landing-page interactive demo render the **same** canvas + rail + toolbar composition. Divergence is structurally impossible — there is no second implementation.

```
src/components/MockupViewer/
  ViewerShell.tsx        # bare shell — geometry + draft state + pin layer + rail + toolbar
  AppMainShell.tsx       # prod wrapper — adds version chip + historic banner via render-prop slots
  AppMainViewer.tsx      # thin pass-through preserving the public API consumed by AppMainViewerWired
  AppMainViewerWired.tsx # data adapter — wires fetch/mutations to the AppMainViewer callback contract
  ViewerCanvas.tsx       # three-layer iframe geometry (wrap / outer / inner with scale transform)
```

`ViewerShell` owns:

- iframe geometry, `ResizeObserver`, viewport modes (fit / preset / custom) via `useViewport(scopeId)`
- the entire draft state machine: `draft`, `status`, `removingPinIndex`, `MAX_PINS` enforcement, 220 ms fade on pin removal
- draft persistence via `useDraftPersistence` (configurable through the `draftPersistence` prop)
- iframe click capture + classification (draft-pin / published-pin / miss) via `useViewerCanvas`
- pin layer composition with `repositionKey` derived from zoom + viewport + fullscreen
- rail composition with `<DraftCard>` slot, toolbar composition with an `extra` slot
- annotation list mutations via `useAppMainAnnotations` (postReply, edit, delete, react, status, prependCreated with dedup)
- keyboard shortcuts via `useDraftKeyboard`

`ViewerShell` does NOT own:

- network calls — every mutation goes through a callback prop (`onCreateAnnotation`, `onPostReply`, …)
- draft persistence storage — the prop is `{ enabled?, storageKey?, debounceMs? }`; demo passes `{ enabled: false }`
- versions / historic mode — caller injects via `renderHistoricBanner` / `renderToolbarChip` render-prop slots
- mockup URL composition — caller resolves to a fully-formed `mockupSrc: { kind: 'src'; url } | { kind: 'srcDoc'; html }`

`AppMainShell` wraps `ViewerShell` for production: derives `isHistoric` from `viewingVid !== currentVid`, composes the iframe URL with the `?v=` query param when historic, calls `useInvalidViewingVidNotifier`, and populates the two render-prop slots with `<HistoricBanner>` and `<VersionChip>`.

The landing demo (`src/components/landing/InteractiveDemo/DemoStage.tsx`) skips `AppMainShell` and renders `<ViewerShell>` directly with `mockupSrc={{ kind: 'srcDoc', html: SAMPLE_HTML }}`, `draftPersistence={{ enabled: false }}`, and a localStorage-backed adapter (`useDemoAdapter`) that maps store mutations onto the same callback contract.

The seam — callbacks in, presentation out — is the rule. Any new viewer behaviour belongs in `ViewerShell`; any new prod-only feature belongs in `AppMainShell`. The demo gets every shell change for free.

`AppShell.tsx` lives directly under `src/app/` (not inside `(app)/`) because the route-group layout imports it via a relative path.

## Copy / i18n

The UI ships in **English**. All visible labels, aria attributes, button copy, section headers, and toast messages are written in EN. The product is not localised — every translated string is a bug.

When adding a new surface, write the strings in EN directly in JSX (no `t()` helper, no locale map). Pre-existing PT-BR text in any new PR must be translated as part of the change.

## Composition rules

- **Pages are client components** that fetch data via `fetch('/api/…')` in `useEffect` and render loading / error / success states. They do not import Prisma; they do not call `identify()`.
- **Client islands receive plain data** — never functions or Prisma rows. Servers return ISO-string dates; clients render them.
- **Effects run twice in dev** (React Strict Mode). Anything that mutates state (fetching, persisting drafts) must be idempotent. For pages, the `useEffect` cleanup MUST abort the in-flight fetch via an `AbortController` (the catch handler ignores `AbortError`) so a fast unmount or param change doesn't write to a dead component AND doesn't waste a server response.
- **Refs** for imperative APIs live in the client island, exposed via an `onMount` callback to a sibling control when an outer component needs to drive the inner instance.

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

## Mobile shell pattern

Every authenticated route (home, projects, settings, annotations) uses the same mobile shell:

- The `<Sidebar>` component is the single owner of the mobile entry point. At viewport `< 768 px` it renders only the collapsed pill (logo `M.` + collapse button) anchored top-left.
- Tapping the pill opens `sidebar-mobile-drawer` — a native `<dialog>` 280 × 100vh that slides in from the left with a `oklch(0% 0 0 / 0.6)` scrim covering the rest of the viewport.
- The drawer reuses the same `treeContent` and `footerContent` props passed to the desktop `<Sidebar>` — no parallel mobile tree.
- Four ways to close the drawer: scrim tap, `Esc`, any nav-link tap inside the drawer, the `✕` button in the panel's top-right (28 × 28).
- `ProjectSidebar` (and any future per-route sidebar) does NOT implement its own hamburger. The `<Sidebar>` component handles it for everyone.
- The topbar's search-pill collapses to a 32 × 32 icon button between the breadcrumb and the avatar at `< 768 px`. Kbd chips disappear (global rule in `Kbd.module.css`).
- The command palette adds a `✕` button on mobile to replace the missing ESC affordance.
