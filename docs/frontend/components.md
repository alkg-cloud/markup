# Components

## Server / client split

Next.js App Router treats every component as a server component by default. Add `'use client'` at the top of a file ONLY when one of these is needed:

- React state (`useState`, `useReducer`)
- Effects (`useEffect`, `useLayoutEffect`)
- Event handlers attached to JSX (`onClick`, `onChange`)
- Browser-only APIs (`window`, `document`, `localStorage`)
- Third-party React libraries that themselves need a client environment (e.g. tldraw)

Server components fetch data and pass it as serialisable props to the client island. Client components don't fetch directly — they receive data from the server tree.

```
page.tsx (server)              ← reads Prisma, computes paths, file IO
  └─ <ClientIsland data={…} /> ← 'use client'
```

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
    ThreadTimeline.tsx      # 'use client' — reply textarea
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
    CommandPalette.tsx         # 'use client' — ⌘K overlay with search + keyboard nav
    CommandPalette.module.css  # glassmorphism panel, scrim, animations
    flatten.ts                 # pure util — ProjectTree[] → FlatSearchItem[]
    filter.ts                  # pure util — filter + group by type
  Topbar/
    Topbar.tsx              # 'use client' — 52px topbar with search pill + avatar + breadcrumb
    Topbar.module.css       # topbar, searchPill, avatarBtn styles
  FolderCard/
    FolderCard.tsx          # server-safe — folder card with CSS Modules (Link + SVG icon)
    FolderCard.module.css   # card, icon, info, name, meta styles
  EmptyState/
    EmptyState.tsx          # 'use client' — project/folder empty states
    EmptyState.module.css   # container, icon, title, desc, actions, btn-accent, btn-secondary styles
  Statusbar/
    Statusbar.tsx           # 'use client' — 24px bar with project stats
    Statusbar.module.css    # bar + segment styles
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
    Toast.tsx               # 'use client' — ToastProvider (root layout) + useToast() hook; 4 variants (success/error/warning/info)
    Toast.module.css        # container, toast card, icon, dismiss, slide-in/out animation
```

Page-scoped components (used only by one page) live next to the page file:

```
src/app/mockups/
  page.tsx                   # server — list grid
  MockupCard.tsx             # 'use client' — card with badge, monogram fallback
  MockupCard.module.css      # card + thumb + badge styles
  [id]/
    page.tsx                 # server — fetches the mockup + annotations
    MockupViewer.tsx         # 'use client' — iframe + pin overlay
    Versions.tsx             # 'use client' — sidebar version list
    diff/
      page.tsx               # server
      DiffViewer.tsx         # 'use client' — side-by-side iframes
src/app/projects/
  layout.tsx                 # server — auth + Prisma tree fetch → grid shell (CSS module for responsive grid)
  layout.module.css          # responsive grid: sidebar + main on desktop, single column on mobile <768px
  page.tsx                   # server — redirect to first project
  ProjectSidebar.tsx         # 'use client' — sidebar wrapper using Sidebar shell, folder create, move, mobile drawer, footer with New Project button
  ProjectSidebar.module.css  # footer + btn-new-project styles
  [slug]/
    page.tsx                 # server — project root content
    ProjectContent.tsx       # 'use client' — toolbar, folder/mockup card grid, statusbar
    [folderId]/
      page.tsx               # server — folder content with ancestor breadcrumbs
```

The page-scoped pattern means `MockupCard.tsx` is co-located with `page.tsx` in `src/app/mockups/`. This keeps the import surface obvious and prevents `src/components/` from accumulating one-off pieces.

## Composition rules

- **Server components are async functions** that return JSX. Read DB rows directly via the Prisma client; no extra layer of indirection.
- **Client islands receive plain data**, never functions or Prisma rows. Serialise dates as ISO strings before passing.
- **Effects run twice in dev** (React Strict Mode). Anything that mutates state (creating a tldraw asset, fetching) must be idempotent. See [tldraw](tldraw.md#strictmode-dedup).
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
