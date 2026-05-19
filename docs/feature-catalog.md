# Feature Catalog

Exhaustive inventory of every user-visible interaction, state, animation, and surface in Markup. **This is the single source of truth that visual-QA, visual-refine, and any UI-touching task tests against.** Every entry has a stable kebab-case ID so issues, screenshots, and reports can reference it durably.

---

## How to use this catalog

- **Visual QA:** walk the catalog top-to-bottom; every ID is a test point.
- **Issue references:** use `[fc:<id>]` in issue titles/descriptions (e.g. `[fc:sidebar-tree-expand]`).
- **Freshness rule:** any PR that adds, removes, or changes a user-visible surface MUST update this catalog in the same changeset. See `CLAUDE.md § Feature-catalog freshness`.

---

## auth-setup

First-run admin creation screen at `/setup`.

| ID | Surface / Interaction | States |
|---|---|---|
| `auth-setup-form` | Form with name, email, password fields | idle, submitting, success-redirect, validation-error |
| `auth-setup-submit` | "Create account" button | default, hover, focus-visible, active, disabled (while submitting) |

## auth-login

Login screen at `/login`.

| ID | Surface / Interaction | States |
|---|---|---|
| `auth-login-form` | Form with email + password fields | idle, submitting, error (invalid credentials), success-redirect |
| `auth-login-submit` | "Sign in" button | default, hover, focus-visible, active, disabled (while submitting) |

## topbar

Global 52 px top bar (`Topbar.tsx`). Present on all authenticated pages. Margin-left shifts to 80 px when sidebar is collapsed.

| ID | Surface / Interaction | States |
|---|---|---|
| `topbar-bar` | Fixed top bar with search pill (centered), breadcrumbs (left), avatar (right) | visible on all auth pages; margin-left: 80 px when sidebar collapsed, smooth transition via `--morph-dur` |
| `topbar-search-pill` | Search trigger pill centered in topbar (min 240 px, max 340 px) with VscSearch icon + "Search..." text + platform shortcut hint (`Ctrl+K` on Windows/Linux, `⌘K` on Apple platforms) | default, hover (border brightens to `--border-strong`, bg to `--surface-hover`), focus-visible, active; opens `command-palette` and closes avatar dropdown |
| `topbar-avatar-btn` | User avatar button (top-right), 32 px circle with initials | default, hover (border-color accent), focus-visible, active; opens `topbar-avatar-menu` via `usePopover` |
| `topbar-avatar-menu` | Native HTML popover (`popover="auto"`) anchored to `topbar-avatar-btn` via `usePopover('right')`. Two items only: **Agent Tokens** (navigates to `/settings/agents`) and **Sign Out** (danger variant). Settings and Notifications are not shipped. Paints in the browser top-layer — light-dismiss + ESC handled natively. Closes automatically when `command-palette` opens. | closed, open |
| `topbar-breadcrumbs` | Breadcrumb strip — starts at project name (no "Markup" / "Home" prefix). Logo serves as root navigation | see `breadcrumbs-*` entries |

## sidebar

Collapsible sidebar shell (`Sidebar.tsx`). Present on every authenticated workspace route — the `all-projects` grid at `/`, `/projects/<slug>` (and nested folders / mockups), `/annotations/[id]`, and `/settings/agents`. The sidebar morphs into a floating pill when collapsed.

| ID | Surface / Interaction | States |
|---|---|---|
| `sidebar-shell` | Fixed sidebar container that morphs between expanded (280 px full-height) and collapsed (84 x 40 px floating pill at top-left). Collapse state persists across project, folder, mockup, settings, and annotation navigations in the same browser. Transitions: width, height, top, left, border-radius, border-color, box-shadow — all via `--morph-dur` (360 ms) / `--morph-ease` | expanded, collapsed (pill) |
| `sidebar-header` | Header with logo + collapse button. Shrinks to pill size when collapsed (height matches `--pill-height`). Logo and toggle always visible in both states | expanded (full width), collapsed (pill-sized) |
| `sidebar-logo` | "Markup." text with capital M, accent-green dot. Animates to "M." on collapse via `max-width` + opacity transition. Full text fades out at 50% of morph-dur (ease-exit), fades in with 40% delay on expand (ease-standard) | expanded ("Markup."), collapsed ("M.") |
| `sidebar-collapse-toggle` | Toggle button to expand/collapse. Icon changes: VscLayoutSidebarLeftOff (expanded) → VscLayoutSidebarLeft (collapsed). Height: 14 px. Remains visible as floating button next to logo in collapsed state | default, hover (`--surface-hover` bg), focus-visible, active |
| `sidebar-scroll` | Scrollable tree area. Phased fade: opacity fades out at 35% of morph-dur (ease-exit) before geometry morphs. On expand, fades in at 55% delay. `pointer-events: none` + `overflow: hidden` when collapsed | visible (expanded), hidden (collapsed) |
| `sidebar-footer` | Footer with "+ New Project" button. Same phased fade as scroll area | visible (expanded), hidden (collapsed) |
| `sidebar-new-project-btn` | "+ New Project" button in footer | default, hover, focus-visible, active; opens `new-project-dialog` |
| `sidebar-pill-position` | Collapsed pill position: `--pill-top: 5px`, `--pill-left: 5px` | pill has border-radius pill, elevated shadow, translucent bg with backdrop-filter |
| `sidebar-mobile-drawer` | `<dialog>` drawer on viewports < 768 px | closed, open; focus-trapped, scrim backdrop |
| `sidebar-mobile-hamburger` | Hamburger button to open mobile drawer | default, hover, focus-visible, active |

## sidebar-tree

ARIA tree widget for project/folder navigation (`ProjectTree.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `sidebar-tree-root` | `role="tree"` container | populated, empty (shows project empty state) |
| `sidebar-tree-project-item` | Project node with icon (from icon-picker or default), name, expand chevron | default, hover (`--surface-hover` bg, `--text` color), focus-visible, active, selected (accent bar + `--accent-overlay-soft` bg + `--accent-bright` text) |
| `sidebar-tree-folder-item` | Folder node with VscFolder icon, name, expand chevron | default, hover, focus-visible, active, selected |
| `sidebar-tree-mockup-item` | Mockup leaf node with VscFile icon, name | default, hover, focus-visible, active, selected |
| `sidebar-tree-expand` | Chevron (12 px) on folder/project. Smooth rotation animation — not abrupt | collapsed (0 deg), expanded (90 deg, color: `--accent`); animates via `--motion-fast` / `--ease-standard` |
| `sidebar-tree-keyboard-nav` | Full keyboard navigation per WAI-ARIA treeview | ArrowUp/Down (move focus), ArrowRight (expand or move to first child), ArrowLeft (collapse or move to parent), Enter/Space (activate), Home/End, Escape, Tab |
| `sidebar-tree-kebab` | Three-dot kebab icon. Replaces count badge on hover with animated swap (count scales to 0.8 and fades out, kebab fades in simultaneously) | hidden (default), visible (hover/focus); opens `sidebar-tree-kebab-menu` via `usePopover` |
| `sidebar-tree-kebab-menu` | Native HTML popover (`popover="auto"`) anchored to the row's kebab via the `TreeNodeKebab` subcomponent's `usePopover('right')`. Project kebab: **Open**, **Edit** (opens project update dialog with current values), **New folder** (top-level folder under the project via `POST /api/projects/[id]/folders` with `parentId: null`), **Delete**. Folder kebab: **Open**, **Rename** (inline input in the row), **New subfolder**, **Delete**. Mockup kebab: **Open**, **Rename**, **Delete**. The Delete item is a danger-styled label dropped of its redundant noun — the kebab is already scoped to a specific row, so `aria-label` retains the noun + row name for assistive tech (e.g. `Delete project Lumen Coffee`). Selecting Delete opens a `confirm-dialog` quoting the noun and the row's name; only on accept does the client fire `DELETE /api/projects/[id]` / `DELETE /api/folders/[id]` / `DELETE /api/mockups/[id]`. Top-layer paint — escapes the sidebar's `overflow-y: auto` so the menu is never clipped. Each row owns its own `usePopover` instance; opening one row's menu closes any other open popover via the HTML spec's single-popover-auto invariant. | open, closed |
| `sidebar-tree-count-badge` | Child-count badge on folders/projects. Swaps out for kebab on hover | visible (no hover), hidden (hover — replaced by kebab) |
| `sidebar-tree-indent` | Visual indentation per nesting level (tree-indent-1 through tree-indent-4) | up to 5 nesting levels |
| `sidebar-tree-accent-bar` | 3 px left accent bar on selected item | visible when item is the current route |
| `sidebar-tree-truncation` | Long names truncated with `text-overflow: ellipsis` | full name in `title` tooltip |
| `sidebar-tree-no-project-section` | Section header `NO PROJECT` groups mockups without a project; rendered only when at least one orphan mockup exists. Replaces the prior synthetic `Ungrouped` pseudo-project node. Orphan mockup rows are full treeitems — clickable (navigates to `/projects/unsorted/<mockup-slug>` via `mockupSlugHref`), Enter/Space activate, and they get `aria-selected` + the active style when the URL matches. | expanded, collapsed; active when URL matches one of its leaves |
| `sidebar-section-headers` | Section headers `PROJECTS` and `NO PROJECT` divide the sidebar tree. Sticky to the top of the scroll container. | visible, hidden (NO PROJECT hidden when no orphan mockups) |
| `sidebar-tree-persist-on-nav` | Expand/collapse state of every project and folder node survives navigation between in-shell pages (`/`, `/projects`, `/projects/<slug>`, `/projects/<slug>/<...folders>/<mockup-slug>`, `/annotations/[id]`, `/settings/agents`) because the shell mounts once in the `(app)` route-group layout | preserved on client-side navigation |
| `sidebar-tree-persist-expansion` | Tree expansion (which projects/folders are open) is persisted in `localStorage.markup.sidebar.expanded` (JSON array of node IDs). Survives reload and tab close. Auto-expand of the active node's path on mount remains additive. | persisted across reloads |
| `sidebar-tree-active-scroll` | When the URL changes (soft-nav), the active tree node is scrolled into view via `scrollIntoView({block:'nearest', behavior:'smooth'})`. | triggered on every soft-navigation |
| `sidebar-tree-cursor-grab` | Draggable mockup leaves show `cursor: grab` on hover and `cursor: grabbing` on mousedown. The drag affordance is a 16 × 16 `GoGrabber` (from `react-icons/go`) revealed on row hover via opacity. Same canonical glyph as `mockup-viewer-rail-drag` and `mockup-viewer-toolbar-drag`; row-scoped grabs scale down to fit the ~24 px row height — the canonical 25 × 25 size applies to standalone overlay surfaces. | hover, mousedown |
| `sidebar-tree-active-path` | On mount and on every navigation, the chain of ancestors leading to the currently visible surface is auto-expanded so the active node is in view: the project + every parent folder for `/projects/<slug>/<...folders>/<mockup-slug>` (walks folder names from the path) and `/annotations/[id]`, the project + the parent folders for `/projects/<slug>/<...folders>`, the project for `/projects/<slug>`. Already-expanded nodes are never collapsed by this behaviour | active mockup, active folder, active project |

## sidebar-tree-dnd

Drag-and-drop reordering within the sidebar tree (`useTreeDnD.ts`).

| ID | Surface / Interaction | States |
|---|---|---|
| `sidebar-tree-dnd-idle` | Default state | cursor: default, no ghost |
| `sidebar-tree-dnd-dragging` | Item being dragged | ghost clone at 60% opacity, original at 40% opacity, cursor: grabbing |
| `sidebar-tree-dnd-over-valid` | Ghost over valid drop zone | drop indicator line (2 px accent) OR folder highlight border |
| `sidebar-tree-dnd-over-invalid` | Ghost over invalid drop zone (own item, descendant of dragged folder, Recents, beyond max depth) | cursor: not-allowed |
| `sidebar-tree-dnd-dropped` | Item dropped on valid target | ghost fade-out (80 ms), item fade-in at new position (120 ms) |
| `sidebar-tree-dnd-cancelled` | Drag cancelled (Escape / mouseup outside) | ghost spring-back animation (`--ease-spring`, 180 ms) |
| `sidebar-tree-dnd-auto-expand` | Hovering closed folder for 600 ms | folder auto-expands to reveal drop targets |
| `sidebar-tree-dnd-keyboard` | Keyboard move mode | Space enters mode, Arrow moves item, Enter confirms, Escape cancels; `aria-live="assertive"` announces position |
| `sidebar-tree-dnd-mobile-move` | "Move to..." context menu on < 768 px | long-press or kebab opens modal destination picker (drag disabled) |

## sidebar-recents

Recents section in the sidebar (`RecentsSection.tsx`). Virtual section — not a real folder.

| ID | Surface / Interaction | States |
|---|---|---|
| `sidebar-recents-section` | "Recentes" region at project root only (never inside folders). Shows last 5 accessed mockups in this project, most recent first. Label styled as uppercase `--text-muted` | visible (>= 1 accessed mockup), hidden (no history); `role="region"`, `aria-label="Recentes"` |
| `sidebar-recents-item` | Recent mockup link with icon + name + relative timestamp (mono font) | default, hover (`--surface-hover`), focus-visible. Read-only: no drag handle, not a drop target |
| `sidebar-recents-empty` | Section not rendered when no history | N/A — section simply absent |

## sidebar-inline-folder-create

Inline folder creation input in the sidebar (`InlineFolderCreate.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `sidebar-folder-create-input` | Inline text input for folder name. Placeholder: "Nome da pasta". On every keystroke `validateUrlSafeName` runs; an illegal character flips the input border to `--danger` and renders the inline error below it (e.g. `" " is not allowed. Use only letters (a–z, A–Z), digits, hyphens (-), or underscores (_).`). | idle, focused, error (URL-safe violation OR duplicate name "Já existe uma pasta com esse nome aqui.") |
| `sidebar-folder-create-confirm` | Enter key confirms creation. Blocks submit when the URL-safe validator fails — the inline error remains until the user fixes the name. | success: folder appears in tree; empty name: no action, focus stays |
| `sidebar-folder-create-cancel` | Escape key cancels | input removed, no folder created |
| `sidebar-folder-create-maxlen` | Names > 255 chars truncated silently | no visible error |

## breadcrumbs

Structural breadcrumb navigation (`Breadcrumbs.tsx`). No "Markup" or "Home" prefix — the clickable logo handles root navigation. Breadcrumb starts with the project name: `{project} › {folder} › {mockup}`. The mockup viewer renders the full ancestor chain (`/projects/[slug]/[...path]/page.tsx` is a client component that calls `GET /api/projects/by-slug/[slug]/resolve?path=…`; the route handler resolves the trailing path via `resolveProjectPath` and walks `Folder.parentId` to build the breadcrumb chain). The settings page (`/settings/agents`) intentionally renders an empty breadcrumb — the page's own h1 carries the label and would be redundant.

| ID | Surface / Interaction | States |
|---|---|---|
| `breadcrumbs-nav` | `<nav aria-label="Navegação estrutural">` with `<ol>` breadcrumb trail. Visible inside projects and on the mockup viewer; hidden at app root and on `/settings/*` | visible, hidden |
| `breadcrumbs-segment` | Clickable ancestor segment (text-dim, hover → text). `BreadcrumbSegment.href` is optional — segments without `href` render as plain text (same treatment as `breadcrumbs-current`) | default, hover, focus-visible; navigates to that level |
| `breadcrumbs-current` | Final segment (non-clickable). Also rendered as plain text whenever a segment has no `href` | `aria-current="page"` on the last; plain `<span>` for href-less mid-list segments; `--text-bright`, `--weight-semibold` |
| `breadcrumbs-separator` | `›` chevron separator between segments | `--text-muted`, 11 px, flex-shrink 0, aria-hidden on separator span |
| `breadcrumbs-ellipsis` | Truncation `...` for long paths. First segment (project) and last (current) never truncated. Minimum: `Project / ... / Current` | clickable: expands full breadcrumb inline |
| `breadcrumbs-keyboard` | Tab into nav, ArrowLeft/Right between segments | Enter navigates |
| `breadcrumbs-mobile` | Aggressive truncation on < 768 px | shows current + `...` link to parent; tap expands as dropdown |

## command-palette

Global command palette (`CommandPalette.tsx`). Opens via `Ctrl+K` / `⌘K` or topbar search pill. Glassmorphism style matching Variante E "palette-container".

| ID | Surface / Interaction | States |
|---|---|---|
| `command-palette-trigger` | `Ctrl+K` on Windows/Linux, `⌘K` on Apple platforms, or search pill click. The shortcut and search pill dispatch an `open-command-palette` custom event on `document`; `CommandPalette` listens for this event to open. The keydown listener is also installed inside every **same-origin** iframe document that lives under `<body>` (mockup-viewer iframe today, future embedded previews tomorrow), and re-installed on each iframe `load` event — without this, focus inside the mockup iframe swallows the shortcut and the palette never receives it. A `MutationObserver` rooted on `document.body` catches iframes added after mount. Other overlays (e.g. the Topbar avatar dropdown) also listen for `open-command-palette` and close themselves so no two overlays coexist. | opens overlay |
| `command-palette-scrim` | Backdrop scrim — light tint (`rgba(0,0,0,0.20)`) + the **standard glass blur** (`backdrop-filter: blur(16px) saturate(140%)`). Same recipe as every other modal scrim in the product. | visible when open; click dismisses |
| `command-palette-panel` | Glass panel using the standard tokens (`--surface-glass-bg`, blur 16 px / saturate 140%, `--surface-glass-border`, `--shadow-popover`). Positioned top-center, `min(640px, 92vw)`. | scale-in animation on open |
| `command-palette-input` | Search text input with VscSearch icon. **Auto-focuses every time the palette opens** — focus is wired via a `useEffect` that fires when `open` flips to `true`, so the keyboard shortcut (`Ctrl/⌘+K`) AND the search-pill click both land focus in the input without an extra Tab. Matching text highlighted with `<mark>` (accent-overlay-mid bg, accent-bright text). | idle, typing (filters results live, staggered 20 ms entry animation per result) |
| `command-palette-results` | Grouped result list: projects first, then folders, then mockups. Each with appropriate icon (project icon, VscFolder, VscFile) | populated, empty ("No results"), loading |
| `command-palette-result-item` | Individual result row with icon + name + path (mono) | default, hover (`--surface-hover`), focused (keyboard), selected |
| `command-palette-keyboard-nav` | ArrowUp/Down to move, Enter to select, Escape to close | full keyboard loop |
| `command-palette-esc-badge` | Escape badge / button in palette footer with keyboard hints | default, hover (`--text` + `--border-strong`) |
| `command-palette-dismiss` | Escape key or scrim click | closes palette |

## new-project-dialog

New Project creation dialog (`NewProjectDialog.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `new-project-dialog-scrim` | Modal scrim backdrop | visible when open; click outside dismisses |
| `new-project-dialog-card` | Dialog card with scale-in animation | open, closed |
| `new-project-dialog-name-input` | Project name text field. Validates URL-safety on every keystroke via `validateUrlSafeName`: an illegal character renders the inline `dialog-error` below the input and disables the primary action. Hint text below the field reads "Use letters, digits, hyphens, or underscores." | idle, focused, error (empty OR URL-safe violation) |
| `new-project-dialog-icon-picker` | Embedded icon picker (same component as project kebab "Change icon") | shows `icon-picker` inline in dialog |
| `new-project-dialog-labels` | Field labels render in ALL-CAPS (`PROJECT NAME`, `ICON`). Primary action button is `Create Project` in create mode and `Update Project` in edit mode. Name input placeholder is `My-Project` (hyphen instead of space — names are URL path segments now). | create mode, edit mode |
| `new-project-dialog-cancel` | Cancel button (`btn-secondary`) | default, hover, focus-visible |
| `new-project-dialog-create` | `Create Project` accent button in create mode, `Update Project` in edit mode | default, hover (`--accent-bright`), focus-visible, active, disabled (submitting) |

## edit-project-dialog

Project update dialog (`NewProjectDialog.tsx` in edit mode).

| ID | Surface / Interaction | States |
|---|---|---|
| `edit-project-dialog-card` | Dialog card matching New Project, prefilled with current project name and icon | open, closed |
| `edit-project-dialog-name-input` | Project name text field. Same URL-safe validation as `new-project-dialog-name-input`. | idle, focused, error (empty OR URL-safe violation) |
| `edit-project-dialog-icon-picker` | Embedded icon picker | shows `icon-picker` inline in dialog |
| `edit-project-dialog-update` | "Update project" accent button (`btn-accent`) | default, hover, focus-visible, active, disabled (submitting) |

## icon-picker

Tabbed icon picker popover (`IconPicker.tsx`). Reusable in "New Project" dialog and "Change icon" from project kebab menu. Uses react-icons (VS Code icons from `react-icons/vsc`).

| ID | Surface / Interaction | States |
|---|---|---|
| `icon-picker-popover` | Positioned popover/container that fills available inline width | open, closed |
| `icon-picker-tabs` | 4 category tabs: **Code** (VscCode icons), **Brands** (VscGithub, etc.), **UI** (VscLayout, etc.), **Emoji** (emoji grid) | default tab, active tab (accent underline) |
| `icon-picker-search` | Search input with VscSearch icon within picker. Filters icons live | idle, typing |
| `icon-picker-grid` | 8-column SVG icon grid | populated, empty (no matches for search) |
| `icon-picker-cell` | Individual icon cell | default, hover (surface-hover), selected (accent border + accent-overlay-soft bg) |
| `icon-picker-footer` | Mono-font preview of selected icon token string (e.g. `vsc:VscFile`) | shows current selection |

## all-projects

Workspace landing surface at `/` (`AllProjectsPage` under `src/app/(app)/page.tsx`). The legacy `/projects` route redirects here client-side. Lists every project the current identity can see as a card grid, with a primary "New project" CTA and per-card kebab actions.

| ID | Surface / Interaction | States |
|---|---|---|
| `all-projects-page` | Page container under the in-shell layout. Renders `Topbar` (breadcrumbs empty) above an `AppMain` scroll variant that hosts a header strip + card grid | loading (skeleton placeholders), error (`http_*` banner), empty (centered `empty-state` clone), populated |
| `all-projects-header` | Page header with `<h1>` "Projects", item count (`{N} projects` / `1 project`), and trailing accent "New project" button | item count uses tabular numerics; CTA opens `new-project-dialog` |
| `all-projects-grid` | Responsive CSS grid of `project-card` tiles in stable `position` order. Min cell width 240 px, max columns fill available width | populated, loading (3 skeleton cards), empty (CTA-centered) |
| `all-projects-new-cta` | Primary `+ New project` button in the header. Opens `new-project-dialog`; on save navigates to the new project's `/projects/<slug>` | default, hover (`--accent-bright`), focus-visible, active |
| `all-projects-empty-cta` | Centered "Create your first project" CTA inside the empty state | only visible when zero projects |
| `all-projects-redirect` | `/projects` page is now a client-side redirect to `/` (no fetch, no UI surface) | redirect on mount via `router.replace('/')` |

## project-card

Card tile for a single project on the `all-projects` grid (`ProjectCard.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `project-card` | Card with resolved project icon, name, mockup count, folder count. Border-radius: `--radius-card`. Whole card is a `<Link>` to `/projects/<slug>`; kebab button absolutely positioned top-right. | default, hover (border → `--border-strong`, bg → `--bg-card-active`, translateY(-1px)), focus-visible, active (translateY(1px)) |
| `project-card-icon` | Resolved icon from `Project.icon` token (same resolver as `sidebar-tree-project-item`). Falls back to a default project glyph when icon is null/unknown | static, `--text-bright` color |
| `project-card-name` | Project name as `<h2>`. Truncated with `text-overflow: ellipsis` | full name in `title` tooltip |
| `project-card-meta` | Mockup count + folder count line in mono font (`{M} mockups · {F} folders`). Singular/plural handled. | `--text-dim`, tabular numerics |
| `project-card-kebab` | Three-dot kebab anchored top-right. Hidden by default, fades in on row hover/focus. Uses `usePopover('right')` for top-layer paint. Items: **Open** (navigates), **Edit** (opens `edit-project-dialog`), **Delete** (`confirm-dialog`, danger). | hidden (default), visible (hover/focus), open (popover paint) |
| `project-card-kebab-menu` | Native HTML popover (`popover="auto"`) with the three actions above. Light-dismiss + ESC handled by the browser. The Delete item fires `confirm-dialog` and on accept calls `DELETE /api/projects/[id]`, then refreshes the page list. | open, closed |

## project-content

Main content area for project and folder views (`ProjectContent.tsx`). Folder cards render above mockup cards.

| ID | Surface / Interaction | States |
|---|---|---|
| `project-content-toolbar` | Toolbar area above card grid | visible at top of content area |
| `project-content-grid` | Unified card grid: folder cards first, then mockup cards, with no separate section headings and no status bar | populated, empty (shows empty state) |
| `project-content-responsive` | Responsive layout | sidebar + main on desktop (>= 768 px), single column on mobile |
| `project-folder-header` | Header above the workspace grid showing the project's icon (resolved from `Project.icon`), the project or folder name as `<h1>`, and an item count (`{N} items` / `1 item`). | always visible when a project or folder is open |

## folder-card

Folder card in the content grid (`FolderCard.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `folder-card` | Card with folder icon, name, metadata. Border: `--border-subtle`, bg: `--bg-card` | default, hover (border → `--border-strong`, bg → `--bg-card-active`), focus-visible |
| `folder-card-icon` | VscFolder SVG icon | static, `--text-dim` color |
| `folder-card-name` | Folder name text | truncated if long, `--text-bright` |
| `folder-card-meta` | Child count / metadata line | `--text-dim`, mono font |

## mockup-card

Mockup card in the content grid (`MockupCard.tsx`). Cards have thumbnail with gradient overlay.

| ID | Surface / Interaction | States |
|---|---|---|
| `mockup-card` | Card with thumbnail, name, status badge. Border-radius: `--radius-card` (14 px) | default, hover (translateY(-4px) + `--shadow-md`), focus-visible |
| `mockup-card-thumb` | Thumbnail image (PNG from `/api/mockups/[id]/thumbnail`) with gradient overlay | loaded, fallback (deterministic monogram with palette-cycled hue from 6-entry list keyed on mockup id) |
| `mockup-card-badge` | Status badge: `open` (default accent), `resolved` (success), `archived` (warning) | pill-shaped, uppercase label |
| `mockup-card-name` | Mockup name text | truncated if long |

## empty-state

Empty state component for projects and folders (`EmptyState.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `empty-state-project` | Empty project (no mockups, no folders). Icon (48 px, 50% opacity) + title (18 px bold, `--text-bright`) + description (13 px, `--text-dim`, max 320 px) + action buttons | visible when project has no content |
| `empty-state-folder` | Empty folder. Same visual pattern as project empty state | visible when folder has no content |
| `empty-state-cta-primary` | "Upload mockup" accent button (`btn-accent`) | default, hover (`--accent-bright`), focus-visible, active |
| `empty-state-cta-secondary` | "Create folder" / "Create subfolder" secondary button (`btn-secondary`) | default, hover (`--btn-bg-hover` + `--border-strong`), focus-visible, active |
| `empty-state-sidebar-inline` | Inline "Empty folder" text in sidebar when expanded folder has no children | shown below empty expanded folder |

## mockup-viewer

Mockup viewer at `/projects/<slug>/<...folders>/<mockup-slug>` (the `(app)/projects/[slug]/[...path]/page.tsx` client page detects the mockup-resolution branch of `GET /api/projects/by-slug/[slug]/resolve?path=…` and renders `MockupViewerPage`, which fetches `GET /api/mockups/[id]/viewer` and forwards the payload to `AppMainViewer.tsx`). Canonical viewer URLs are path-based and human-readable; orphan mockups resolve under the synthetic project slug `unsorted`. The viewer composes **floating, draggable chrome** (rail + toolbar + composer + marking-bar) directly above the canvas — no in-canvas toolbar, no side panel.

**Layout in normal mode:** the viewer inhabits the in-shell area to the right
of the project sidebar and below the topbar, exactly like every other `(app)`
page (folder view, annotation view, settings). Sidebar and topbar **remain
visible**. Floating chrome clamps to AppMain bounds (8 px margin), NOT the
viewport. The topbar's breadcrumbs end at the mockup name; the sidebar tree
highlights the active mockup leaf.

**Layout in fullscreen mode** (toggled via `mockup-viewer-toolbar-fullscreen`
or the `f` shortcut): uses the Fullscreen API on the AppMain element — the
**only** state that hides the global sidebar + topbar. All floating chrome
inside AppMain survives the transition because it lives inside the fullscreen
element. Exiting fullscreen (Esc or `f` again) restores the in-shell layout.

Drawing (tldraw), inline diff modal, and edit-mode toggle are parked — see
`docs/future-features.md`.

### mockup-viewer-app-main

The viewer surface. Fills the in-shell area in normal mode; takes the full
viewport when its Fullscreen API is active. Glass-bg chrome floats above.

| ID | Surface / Interaction | States |
|---|---|---|
| `mockup-viewer-app-main` | `<main>` hosting canvas-stage + floating overlays. `position: relative; flex: 1; min-height: 0; overflow: hidden`. Sized by the `<main>` flex cell that sits to the right of `sidebar-shell` and below `topbar-bar`. | in-shell (default), fullscreen (via Fullscreen API on this element) |
| `mockup-viewer-fullscreen-mode` | Fullscreen state. Triggered by `mockup-viewer-toolbar-fullscreen` or `f` shortcut. Uses `appMain.requestFullscreen()`; the browser removes shell chrome until `document.exitFullscreen()` or Esc. Floating rail/toolbar/composer/marking-bar all survive because they live inside the fullscreen element. | inactive, active |
| `mockup-viewer-canvas-stage` | Scrollable container around the mockup iframe. `position: absolute; inset: 0; overflow: auto`. | overflow auto when zoomed past container bounds |
| `mockup-viewer-mockup-doc` | The iframe rendering `/m/[id]/...`. Receives `transform: scale(var(--zoom))` for canvas zoom. | loading, loaded, error |
| `mockup-viewer-pin-layer` | Non-scaling overlay (sibling of mockup-doc) hosting pin elements. Positions reposition on container resize, scroll, zoom, and fullscreen transitions — NOT just viewport resize. | `pointer-events: none` on layer; pins re-enable for click delegation |
| `mockup-viewer-in-shell-topbar` | The `topbar-bar` rendered above the viewer with breadcrumbs `[Project] / [Folder] / [Mockup]`. Hidden in fullscreen mode. | visible (in-shell), hidden (fullscreen) |
| `mockup-viewer-in-shell-sidebar` | The `sidebar-shell` rendered to the left of the viewer. Same expand/collapse persistence as every other in-shell page. Hidden in fullscreen mode. | visible (in-shell), hidden (fullscreen) |

### mockup-viewer-pin

DOM-anchored pin. Position recomputed via the anchoring runtime on
every layout change. See spec §6.

| ID | Surface / Interaction | States |
|---|---|---|
| `mockup-viewer-pin` | 30×30 teardrop pin rotated -45°. Glass bg, per-annotation accent border + number, opacity 0.55 default. The tooltip pseudo-element counter-rotates 45° so the label reads horizontally above the rotated shape. Clicking a pin activates the matching annotation AND pins `mockup-viewer-rail` open (via the rail's `expandSignal` prop) so the matching card is visible without an extra hover gesture; the user can still unpin the rail via `mockup-viewer-rail-lock-open`. | idle (0.55 opacity), hover (opacity 1, accent border brightens — no scale), active (accent border + 2px soft glow ring — no animation), pending (same glass tag as idle + dashed accent border + 1.6s soft pulse) |
| `mockup-viewer-pin-anchor-text` | Text-anchor variant — stores `{path, textOffset, subX, subY}` so the pin tip lands on a specific character sub-position | resilient to reflow / wrap / font changes |
| `mockup-viewer-pin-anchor-element` | Element-anchor variant — stores `{path, offsetX, offsetY}` for clicks outside text | fractional bbox offset |

### mockup-viewer-rail (Annotations rail)

Left-side floating panel. See spec §4.

| ID | Surface / Interaction | States |
|---|---|---|
| `mockup-viewer-rail-collapsed` | 60px-wide column of colored pin badges + drag handle (top) + "+ New annotation" button (bottom morphs round). Capped at `max-height: 70vh` (`80vh` on viewports ≤768px) so a long list never overflows the canvas; inner list scrolls vertically. | default state |
| `mockup-viewer-rail-hover-expanded` | Transient 300px width on body mouseenter (NOT on drag handle). Same `max-height` cap as collapsed. | width transition via `--motion-base` |
| `mockup-viewer-rail-pinned` | Sticky 300px width via Lock-open toggle. Also driven externally by bumping `expandSignal` from `AppMainViewer` — a canvas pin click pins the rail open so the matching card is in view. | persists past mouseleave, button shows pressed state |
| `mockup-viewer-rail-drag` | Drag handle uses the project's shared grab glyph `GoGrabber` from `react-icons/go` (sized 25 × 25 — canonical drag-affordance size across the product; rotated 90° because the rail's grab slot is horizontal and `GoGrabber` ships vertical). Drag handle DOES NOT trigger hover-expand — only the rail body does. Has `touch-action: none` so pointer drag works on touchscreens. Dragged position is cleared when fullscreen toggles so the rail returns to its spec-default coordinates instead of being stranded off-screen. | grab/grabbing cursor |
| `mockup-viewer-rail-lock-open` | Lock-open button rendered with `react-icons/vsc` `VscPinned` — "Keep expanded" / "Unlock" tooltip. Pressed state only changes `background` + `color` (no rotation) — the icon stays upright. | aria-pressed reflects state |
| `mockup-viewer-rail-add-button` | "+ New annotation" button at foot. Morphs round → pill with label + ⌘⇧N (Ctrl+⇧+N on Windows/Linux). Pinned via `flex-shrink: 0` to the spec-default 32 × 32 pill so the inner 30 × 30 icon sits dead-centre even though the collapsed foot inner is narrower than the button's declared width. | collapsed/expanded width transition |

### mockup-viewer-toolbar

Center-bottom floating dock. See spec §5.

| ID | Surface / Interaction | States |
|---|---|---|
| `mockup-viewer-toolbar` | Glass-bg dock with zoom + fullscreen + version chip + drag handle | default, dragging |
| `mockup-viewer-toolbar-zoom-out` | Zoom-out button (`⌘−`) | enabled, disabled at 25% min |
| `mockup-viewer-toolbar-zoom-label` | Clickable % label — resets to 100% | hover, reset |
| `mockup-viewer-toolbar-zoom-in` | Zoom-in button (`⌘+`) | enabled, disabled at 400% max |
| `mockup-viewer-toolbar-fullscreen` | Fullscreen toggle (F) | inactive, active (pressed) |
| `mockup-viewer-toolbar-drag` | Drag handle on right edge — `GoGrabber` from `react-icons/go` (25 × 25 — matches `mockup-viewer-rail-drag`; default vertical orientation matches the toolbar's tall slot). Drag clamps to `mockup-viewer-app-main` bounds (8 px margin), NOT viewport. Has `touch-action: none` so pointer drag works on touchscreens (without this, the browser's native page-pan claims the gesture). Dragged position is cleared when fullscreen toggles so the toolbar returns to its centered-bottom default after the containing block's bounds shift. | grab/grabbing cursor |

### mockup-viewer-version-chip

Replaces the removed standalone History button by embedding a clock icon
inside the chip itself.

| ID | Surface / Interaction | States |
|---|---|---|
| `mockup-viewer-version-chip` | Pill with clock icon + label `vN` (no " · current" suffix — the popover already signals active state) + chev. `N` is the version's **stable** number — persisted on the row via the `MockupVersion.number` column, monotonically increasing per mockup, **never reused** on delete (deleting v1 of [v1,v2,v3] leaves [v2,v3]; the next upload becomes v4). Opens `mockup-viewer-version-popover` via `usePopover('right')`. | closed, open (chev rotated 180°) |
| `mockup-viewer-version-popover` | Native HTML popover (`popover="auto"`) with newest-first version list. Top-layer paint — escapes the toolbar's clip and stacking. Browser-managed light-dismiss + ESC. | closed, open |
| `mockup-viewer-version-item` | One row per version (dot + label + sub). Rendered by the `VersionListRow` subcomponent so each row carries its own `usePopover` for the per-row kebab; nested popovers stack natively via the HTML spec's ancestor relationship — opening a row kebab does NOT close the parent version list. | default, current (accent bg + glowing dot) |
| `mockup-viewer-version-kebab` | Per-row kebab menu (nested popover) — opens Promote / Delete via `usePopover('right')`. | opens Promote / Delete |
| `mockup-viewer-version-action-promote` | Promote version to current | enabled, disabled on current row (with "Already current" tooltip) |
| `mockup-viewer-version-action-delete` | Per-row "Delete" item (label dropped the redundant noun) — opens a `confirm-dialog` quoting the version label (e.g. "Delete v3") + warning that anchors pointing at this version lose their source-of-truth pin. DELETE `/api/mockups/[id]/versions/[vid]` only after confirm. | danger styling |

### annotation-composer (replaces annotation-modal)

Modal-first creation flow with optional multi-pin marking. See spec §7.

| ID | Surface / Interaction | States |
|---|---|---|
| `annotation-composer` | Modal dialog hosting textarea + "Add pin" button + Post / Cancel | closed, open (idle), open (marking) |
| `annotation-composer-scrim` | Backdrop scrim | 0.55 opacity idle, 0 opacity in marking |
| `annotation-composer-panel` | Glass panel | full opacity idle, 0 opacity in marking |
| `annotation-composer-textarea` | Annotation body textarea | idle, focused, filled |
| `annotation-composer-pin-toggle` | "+ Add pin" / pencil "Edit pin" / pencil "Edit pins" morph | 0 / 1 / 2+ pending pins |
| `annotation-composer-post` | "Post annotation" button | enabled, disabled (empty body) |
| `annotation-composer-cancel` | Cancel button — discards pending pins | default |
| `annotation-composer-close` | × close button (top-right) | default |
| `mockup-viewer-marking-bar` | Top-center mode indicator surfaced during marking | hidden, open |
| `mockup-viewer-marking-bar-pin-count` | Live pin count pill (`N pins`, singular/plural) | live |
| `mockup-viewer-marking-bar-done` | Done button — exits marking mode | default |

### annotation-card (one item in the rail's expanded list)

| ID | Surface / Interaction | States |
|---|---|---|
| `annotation-card` | Card with meta + primary comment + foot + chevron thread | default, active (accent bg 30% + left stripe), hover |
| `annotation-card-badge` | Colored circular badge with annotation number | per-color palette 0..15 |
| `annotation-card-author` | Author name in meta row | static |
| `annotation-card-status-pill` | open / needs review / resolved | open (info), needs review (warning), resolved (success) |
| `annotation-card-primary-kebab` | 3-dot kebab button in the meta row, visible only when the primary comment is the current user's. Opens `annotation-card-primary-menu` via `usePopover('right')`. Hosts the status toggle group + Edit + Delete affordances. Replaces the previous standalone pencil. | hidden (not own), visible (own); hover (surface-hover bg), open (accent bg) |
| `annotation-card-primary-menu` | Native HTML popover (`popover="auto"`) anchored to the kebab. Hosts the status toggle group, "Edit" item, and "Delete" (danger) item. Top-layer paint — escapes the rail's `overflow-y: auto`. Browser-managed light-dismiss + ESC; menu items also call `close()` before firing their action so the popover closes with the same gesture. | closed, open |
| `annotation-card-status-toggle` | Icon-only radio group of three status options at the top of the kebab menu: **Open** (`VscCircleLarge`, `--info`), **Needs review** (`VscCommentUnresolved`, `--warning`), **Resolved** (`VscPass`, `--success`). Each icon takes the colour of its matching `annotation-card-status-pill`. The verbose label is exposed via `data-tooltip` + `aria-label`; the body of the button is just the icon. Active option draws an inset 1 px ring in its own colour over the matching `*-soft` background. Clicking dispatches `PATCH /api/annotations/[id] { status }`. | per-option idle / hover / active |
| `annotation-card-delete` | Danger menu item labelled simply **Delete** (drops the redundant noun — the kebab is already scoped to the annotation). Deletes the annotation via `DELETE /api/annotations/[id]` after a `confirm-dialog` accept. Cascades through the thread → messages → reactions. | idle, hover (danger bg) |
| `annotation-card-primary` | Primary comment rendered without head row (author in meta) | renders body + reactions only |
| `annotation-card-foot-date` | Date + time | static |
| `annotation-card-thread-toggle` | Chevron button — "No replies" / "1 reply" / "N replies". Behaves as an accordion: opening one card's thread auto-collapses any other expanded thread. | closed, open (chev rotated 180°) |
| `annotation-card-thread` | Hidden section with reply form + replies | closed, open |
| `annotation-card-reply-form` | Textarea + Reply button | empty (button disabled), filled |

### comment (thread message)

| ID | Surface / Interaction | States |
|---|---|---|
| `comment` | Avatar + name + time + body + reactions + actions | default, hover (actions revealed) |
| `comment-avatar` | 20×20 circular gradient avatar with initials (first letter of first + last word) | per-author color palette 0..15 |
| `comment-action-reply` | Reply icon for non-own comments | default, hover, focus-visible |
| `comment-kebab` | Kebab menu for own comments. Opens a native HTML popover (`popover="auto"`) via `usePopover('right')`. Reply opens the always-visible reply form below; Edit flips the comment into `comment-edit-inline` mode (no native prompt); Delete confirms then DELETEs `/api/messages/[id]`. The primary message (annotation body) cannot be deleted — the API returns 400 and surfaces "Delete the annotation instead". Top-layer paint + browser-managed light-dismiss + ESC. | opens Reply / Edit / Delete |
| `comment-edit-inline` | Inline edit affordance — replaces the comment body with a glass-styled textarea pre-filled with the current body, focused on mount. **Save** persists (PATCH `/api/messages/[id]`) and dismisses; **Cancel** discards. Blur commits (acts like Save). Esc cancels; Cmd/Ctrl+Enter commits. Save and Cancel buttons fire on `mousedown` so they run before the textarea's blur handler. | editing, saving (post-blur, awaiting API), error (left in edit mode) |
| `comment-action-reply` (icon) | Reply affordance uses `VscReply` from `react-icons/vsc` (replaces the inline SVG path); same for the kebab menu's Reply item and the AnnotationCard's submit button. | — |

### reactions (Slack-style)

| ID | Surface / Interaction | States |
|---|---|---|
| `reaction-pill` | Pill with emoji + optional count (count shown when >1) | idle, reacted (current user in list, accent bg) |
| `reaction-pill-tooltip` | Custom hover tooltip — "X and Y reacted with 👍" | glass bg matching `--surface-glass-*` |
| `reaction-add` | Dashed "+" trigger button. Visibility tracks the parent comment's hover/focus-within via the `--reaction-add-opacity` CSS contract: hidden at rest, revealed when the user hovers/focuses the comment. | idle, hover (accent border + bg), open (popover anchored above) |
| `reactions-row-empty-collapse` | When a comment has zero reactions, the `.reactions` footer collapses to `max-height: 0` + `opacity: 0` so no dead vertical lane is reserved. Hovering or focusing the comment animates the row open to `max-height: 28px` (motion-base / ease-standard) and reveals `reaction-add`. Once a comment has reactions, the row stays visible at rest and only the "+" trigger fades on hover (the previous behaviour). | empty + at-rest (collapsed), empty + hover (animated open), non-empty (always open) |
| `emoji-picker` | 4×4 grid native HTML popover (`popover="auto"`) with 16 reaction emojis. Opens via `usePopover('left')` from the comment's "+" reaction trigger. Top-layer paint + browser-managed light-dismiss + ESC. | closed, open |
| `emoji-picker-pick` | Individual emoji button | default, hover (scale 1.2) |

### confirm-dialog

Promise-based replacement for `window.confirm`/`window.alert`/`window.prompt`. Native browser dialogs are banned project-wide — see `docs/code-style.md § Never use native browser dialogs`.

| ID | Surface / Interaction | States |
|---|---|---|
| `confirm-dialog` | Styled Radix `AlertDialog`. Glass surface matching `--surface-glass-*` tokens; overlay 55% black + 2px blur. Used for delete confirmations and surfacing API errors. Imperative API via `useConfirm()` hook — returns `{ confirm, dialog }`; `confirm({ title, description, confirmLabel, danger })` resolves to `boolean`. | closed, open; danger (primary button uses `--danger` palette), neutral |
| `confirm-dialog-cancel` | Cancel/escape button | idle, hover, focus-visible |
| `confirm-dialog-confirm` | Primary action button | idle, hover, focus-visible; danger variant |

### tooltip

| ID | Surface / Interaction | States |
|---|---|---|
| `tooltip` | The single tooltip primitive in the product. A `<div popover="hint" id="markup-tooltip">` rendered once at the root layout by `TooltipPortal`; a capture-phase document listener watches `mouseenter`/`focusin` on every `[data-tooltip]` trigger, copies the text, positions against the trigger's `getBoundingClientRect`, and calls `showPopover()`. Top-layer paint escapes every overflow ancestor and stacking context — the tooltip never gets clipped (e.g. by `.rail .list { overflow-y: auto }`) and never loses a z-index race. The CanvasToolbar's zoom/fullscreen tooltips are the reference; the rail, project-tree kebab, comment kebab, emoji-picker `Add reaction`, lock toggle, drag handles, reaction pills, version-chip clock + per-row kebab, annotation-card kebab, topbar avatar, sidebar logo + collapse-toggle — all route through the same portal. Pairs with `popover-primitive` (same top-layer mechanism, different content). See `docs/code-style.md § Tooltips: one primitive, no exceptions`. | hidden, visible (hover or focus, after ~150 ms dwell) |
| `tooltip-align-left` | Default alignment | left-anchored above trigger |
| `tooltip-align-center` | Centered above trigger | for symmetric layouts |
| `tooltip-align-right` | Right-aligned above trigger | for triggers near right edge |

### glass-surface-standard

| ID | Surface / Interaction | States |
|---|---|---|
| `glass-surface-standard` | Single source of truth lives in `src/styles/glass.module.css`. Two utilities — `floatingSurface` and `floatingScrim` — declare the canonical property block (`background: var(--surface-glass-bg)` / `backdrop-filter: blur(16px) saturate(140%)` / `border: var(--surface-glass-border)` on the surface; `background: var(--scrim-glass-bg)` / `backdrop-filter: blur(16px) saturate(140%)` on the scrim). Every floating overlay (`rail`, `toolbar`, `composer-panel`, `composer-scrim`, `marking-bar`, `sidebar`, `command-palette-panel`, `command-palette-scrim`, `dialog-card`, `dialog-scrim`, `confirm-dialog-content`, `confirm-dialog-overlay`, `topbar-avatar-menu`, `projecttree-kebab-menu`, `annotation-card-primary-menu`, `comment-kebab-menu`, `emoji-picker`, `version-chip-popover`, `version-chip-row-actions`, `toast-pill`) consumes one of these utilities via CSS Modules `composes:`. The tooltip uses the same property block inline because `Tooltip.css` is global (not a module). **Never** write the property block by hand in a new floating component — `composes:` from the utility. Lightning CSS auto-prefixes the unprefixed `backdrop-filter` for older Safari; the utility ships only the unprefixed declaration to avoid the prefix-dedup bug where Lightning CSS keeps `-webkit-` and drops the standard property. No accent-glow ring on neutral surfaces — `--shadow-glow` is reserved for explicitly accent-tinted elements (e.g. the sidebar pill collapsing morph). | single source of truth |

## thread-timeline

Message timeline component (`ThreadTimeline.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `thread-timeline-list` | Chronological message list | populated (>= 1 message) |
| `thread-timeline-message` | Individual message bubble | user message (avatar + body), agent message (avatar + body) |
| `thread-timeline-avatar` | Author avatar chip | user: initials, agent: bot icon |
| `thread-timeline-body` | Message text body | rendered markdown |
| `thread-timeline-timestamp` | Message timestamp | tabular-nums (`font-variant-numeric: tabular-nums`), relative time |
| `thread-timeline-reply-input` | Reply textarea at bottom | idle, focused, filled |
| `thread-timeline-reply-submit` | "Reply" button | default, hover, focus-visible, active, disabled (empty) |
| `thread-timeline-resolve-btn` | "Resolve" thread action | default, hover, focus-visible; POSTs to `/api/threads/[id]/resolve` |
| `thread-timeline-reopen-btn` | "Reopen" thread action (resolved threads) | default, hover, focus-visible; POSTs to `/api/threads/[id]/reopen` |
| `thread-timeline-system-event` | System event (e.g. "marked resolved") | distinct treatment: no avatar, muted text, small icon (see future-features #1) |

## diff-viewer

Side-by-side version diff page at `/mockups/[id]/diff` (`DiffViewer.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `diff-viewer-from-iframe` | Left iframe (base version) | loading, loaded |
| `diff-viewer-to-iframe` | Right iframe (compare version) | loading, loaded |
| `diff-viewer-scroll-sync` | Scroll synchronization between iframes | synced |
| `diff-viewer-overlay-mode` | 50% opacity overlay comparison | toggle between side-by-side and overlay |
| `diff-viewer-version-selector` | Dropdowns to pick from/to versions | default, open (dropdown), selected |

## settings-agents

Agent token management page at `/settings/agents` (`AgentsClient.tsx`). Accessible via avatar menu → "Agent Tokens".

| ID | Surface / Interaction | States |
|---|---|---|
| `settings-agents-list` | List of existing agent token cards. Above the list: `{N} tokens` count label and an accent `+ New Token` button. | populated, empty ("No tokens yet…" message) |
| `agent-tokens` | Each agent token renders as a card pixel-aligned with DS 10-agent-tokens V3: 600 px max-width page container, 36×36 key-icon box (inline SVG, accent-soft bg + `--accent` tinted), name (14 px / 600), meta line `Created X · Last used Y` (or `never`) in `--text-muted`, masked token preview `mk_{live|test}_••••••••••••<lastFour>` in `--font-mono` inside an `--bg-elevated` chip with `--border-subtle` and `--radius-xs`, and two icon buttons (copy + revoke, each 28×28 with `--radius-xs`). Topbar of the page renders an empty breadcrumb — the page h1 already carries the label. | default; copy hover: `--surface-hover` bg + `--text`; revoke hover: `--danger-soft` bg + `--danger` color |
| `settings-agents-create-btn` | `+ New Token` accent button above the token list | default, hover, focus-visible, active |
| `settings-agents-create-form` | Token creation form (name input) | idle, submitting |
| `settings-agents-plaintext` | One-time plaintext token display with copy button shown immediately after creation | shown once after creation; copy shows toast "Copied to clipboard" |
| `settings-agents-revoke-btn` | Revoke icon button per token card. Clicking opens a styled `confirm-dialog` (`useConfirm` from `src/components/ConfirmDialog`) quoting the token name and warning that any client using it will start receiving 401s; only on accept does the client fire `DELETE /api/agent-tokens/[id]`. Never uses native `window.confirm`. | default, hover (`--danger-soft` bg + `--danger` color), focus-visible; shows confirmation dialog before deletion |

## dialog

Reusable modal dialog (`Dialog.tsx`). Shares the **glass-surface standard** with `confirm-dialog`, the rail, toolbar, composer, and every popover — same `--surface-glass-bg`, blur 16px / saturate 140%, glass border, `--shadow-popover`, 14 px radius. The two dialog kinds (generic `Dialog` for forms, Radix `AlertDialog` for confirms) read as one design system on screen.

| ID | Surface / Interaction | States |
|---|---|---|
| `dialog-scrim` | Backdrop scrim — light tint (`rgba(0,0,0,0.20)`) + the **standard glass blur** (`backdrop-filter: blur(16px) saturate(140%)`). Carries the same blur as the rail / toolbar / sidebar so page content behind the dialog visibly blurs through, not just dims. Click outside dismisses. Identical recipe in `confirm-dialog` and `command-palette`. | visible when dialog open |
| `dialog-card` | Dialog card. `width: min(440px, calc(100vw - 32px))`, 18 px padding, gap 8 px between rows. Animates in with the same scale-in spring as `confirm-dialog` (`--motion-base` / `--ease-spring`). | scale-in animation on open |
| `dialog-title` | Title text — 13 px / 700 / 0.01em tracking, `--text-bright`, no margin (the card itself supplies the gap). | static |
| `dialog-field` | Form field wrapper. Label is `--text-dim` 10 px uppercase + 0.08em tracking; hint sits under the input at 11 px `--text-muted`; error replaces hint at 11 px `--danger`. Input is 34 px tall with `--bg-card` background, focus flips border to `--accent-bright` + 3 px `--accent-soft` ring (matches the inline-edit textarea elsewhere in the product). | idle, focused, error |
| `dialog-actions` | Actions row aligned to the end, gap 8 px, margin-top 10 px. | standard layout |
| `dialog-button` | Shared button primitive (`DialogButton` from `@/components/Dialog/Dialog`). 30 px tall, 12 px / 700 / 0.02em tracking, `--radius-xs`, same easing tokens as `confirm-dialog`. Three variants: `secondary` (transparent → `--surface-hover` on hover), `accent` (primary action — `--accent-soft` bg + `--accent-bright` text + `--accent-overlay-mid` border → `--accent-overlay-mid` bg on hover), `danger` (`--danger-soft` bg + `--danger` text + `--danger` border → solid `--danger` bg on hover). Disabled state: 0.4 opacity + not-allowed cursor. Replaces every ad-hoc `btnAccent` / `btnSecondary` that used to live in dialog-consumer CSS files. | secondary, accent, danger; idle, hover, focus-visible (3 px `--accent-soft` ring), disabled |

## popover-primitive

The single popover primitive in the product (`src/lib/popover/usePopover.ts`). Wraps the native HTML popover API (`popover="auto"` + `popovertarget`) and pairs it with `positionPopover` (`src/lib/popover/position.ts`) which anchors the popover to its trigger via `getBoundingClientRect`, flips above when there's no room below, and clamps to the viewport with a 4 px gutter. The popover paints in the browser top-layer — same guarantee `tooltip` uses — so it escapes every overflow ancestor and stacking context. Browser owns light-dismiss, ESC-to-close, and the single-popover-auto invariant (opening one closes the rest). See `docs/code-style.md § Popovers: usePopover, no exceptions`.

| ID | Surface / Interaction | States |
|---|---|---|
| `popover-primitive` | `usePopover<TriggerEl, PopoverEl>(align)` returns `{ triggerRef, popoverRef, triggerProps, popoverProps, close }`. Trigger spreads `popovertarget` + `popovertargetaction='toggle'` so the browser toggles the popover; popover spreads `id` + `popover='auto'` + `ref`. The hook listens to `beforetoggle` and calls `positionPopover` on the next animation frame so the popover lands anchored to the trigger. | closed, open; align: `left`, `center`, `right` |
| `popover-menu-item` | Generic menu item inside a popover (Comment kebab, AnnotationCard kebab, VersionChip rows, Topbar account menu, ProjectTree kebab). | default, hover (`--surface-hover` + `--text-bright`), focus-visible |
| `popover-menu-item-danger` | Danger-variant menu item (Delete annotation, Delete version, Sign Out, Delete project/folder/mockup). | default, hover (`--danger-soft` bg + `--danger` text), focus-visible |
| `popover-menu-divider` | Horizontal divider between popover item groups. | 1 px `--border-subtle`, 4 px margin |
| `popover-nested` | Nested popovers stack natively via the HTML spec's ancestor relationship. Reference: `VersionChip` opens a per-row Promote/Delete popover from inside its own version-list popover; the parent stays open. Each row gets its own `usePopover` instance via the extracted `VersionListRow` subcomponent. | parent + child both open |

## toast

Toast notification system (`Toast.tsx`, `useToast.ts`).

| ID | Surface / Interaction | States |
|---|---|---|
| `toast-container` | Fixed bottom-center container | positioned absolutely |
| `toast-pill` | Individual toast message pill. Uses the **glass-surface standard**: `--surface-glass-bg`, blur 16 px / saturate 140%, `--surface-glass-border`, `--shadow-popover`. No accent glow ring — toasts are neutral surfaces. | slide-in animation (`--motion-fast` / `--ease-spring`), auto-dismiss |
| `toast-reduced-motion` | Reduced motion override | animation zeroed via `prefers-reduced-motion` |

## app-nav

Top navigation pills (`AppNav.tsx`). "Projetos | Agents" pill group with active state via `usePathname()`.

| ID | Surface / Interaction | States |
|---|---|---|
| `app-nav-pills` | Pill navigation group with **Projetos** and **Agents** | visible on authenticated pages |
| `app-nav-pill` | Individual nav pill link | default, hover, focus-visible, active (current route — accent treatment) |

---

## Global surfaces

Cross-cutting visual and interaction surfaces defined in `globals.css` and `tokens.css`.

| ID | Surface / Interaction | States |
|---|---|---|
| `global-atmospheric-mesh` | Body background: two radial gradients + linear tint. Fixed position, z-index 0. All content at z-index 1 | teal-tinted dark canvas |
| `global-focus-ring` | `:focus-visible` box-shadow: 2 px transparent gap + 2 px accent ring. Transition: `--motion-fast` / `--ease-standard` | on every interactive element via global CSS |
| `global-scrollbar` | Thin scrollbar (6 px webkit, `scrollbar-width: thin`) with themed thumb | default (`--border`), hover (`--border-strong`) |
| `global-selection` | `::selection` highlight | `--selection-bg` (accent 32% opacity), `--text-bright` |
| `global-reduced-motion` | `prefers-reduced-motion: reduce` safety net: all `animation-duration`, `animation-iteration-count`, `transition-duration`, `scroll-behavior` zeroed via `!important` | global override in `globals.css` |
| `global-typography-manrope` | Manrope font family (body + display), weights 400-800. Display: 700 weight, tracking -0.02em. Body: 400/500/600, 13-14 px. Labels: 600, 10 px, uppercase, tracking 0.12em | via `next/font/google` |
| `global-typography-jetbrains` | JetBrains Mono (code/tabular), 400/500, 10-12 px | tabular-nums for timestamps, token strings |
| `global-routing-path-based` | All in-shell URLs are human-readable path segments resolved by the `GET /api/projects/by-slug/[slug]/resolve?path=…` aggregator. `/` = `all-projects` landing (card grid of every project the identity can see). The legacy `/projects` route is a thin client-side redirect to `/` so external bookmarks still work. `/projects/<slug>` = project view (calls `/view`). `/projects/<slug>/<...folders>/<mockup-slug>` = mockup viewer (`[...path]` resolved by `resolveProjectPath` to either a folder or a mockup; mockups render `MockupViewerPage` after fetching `/api/mockups/[id]/viewer`, folders render the folder view). `/projects/unsorted/<mockup-slug>` covers orphan mockups. `/annotations/[id]` and `/settings/agents` retain stable single-segment routes. The legacy `/mockups/[id]` viewer route redirects to `/`; `/api/mockups/[id]/*` API endpoints continue to use the mockup id. | path resolution server-side via the API aggregator; canonical paths produced client-side by `routes.ts` helpers (`projectsHref` returns `/`, `projectHref`, `folderHref`, `mockupSlugHref`) |
| `global-sidebar-collapse-persisted` | Sidebar collapse state survives reload. The shell reads `markup-sidebar-collapsed` from the `GET /api/shell` payload (which inspects the cookie) and passes `defaultCollapsed` to `Sidebar`. The client persists subsequent changes to the cookie + `localStorage` in the same write. Because the page is client-rendered, a short loading state precedes the first paint of the sidebar; the collapsed/expanded resolution is correct on first render after that. | cookie-driven default + client persistence — no flicker between renders |
| `global-favicon` | App favicon at `src/app/icon.svg` — Next.js 16 auto-serves it at `/icon.svg` and `<link rel="icon">` is injected at build time. The SVG is a 256 × 256 dark rounded square with a white serif **M** and an accent-green square as the period (matches `sidebar-logo`'s "Markup." typography). | rendered in all browsers; no separate raster ico shipped |
| `global-name-validation` | Single source of truth for URL-safe names: `src/lib/validation/url-safe-name.ts`. Pattern `/^[A-Za-z0-9_-]+$/` is exported as `URL_SAFE_NAME_PATTERN`; `validateUrlSafeName(value)` returns `{ offendingChar, message }` or `null`. Used client-side by `new-project-dialog`, `edit-project-dialog`, `sidebar-inline-folder-create`, and the tree rename input — same `URL_SAFE_NAME_HINT` copy everywhere. Used server-side by `POST /api/projects`, `PATCH /api/projects/[id]`, `POST /api/projects/[id]/folders`, `PATCH /api/folders/[id]`, `POST /api/mockups`, and `PATCH /api/mockups/[id]` — invalid names return `400 name_not_url_safe`. | client error: inline danger message below input; server error: `400 name_not_url_safe` |

---

## Animation inventory

All motion tokens and keyframe animations.

| ID | Token / Animation | Duration | Easing | Reduced-motion override |
|---|---|---|---|---|
| `motion-instant` | `--motion-instant` | 90 ms | `--ease-standard` | zeroed |
| `motion-fast` | `--motion-fast` | 160 ms | `--ease-standard` | zeroed |
| `motion-base` | `--motion-base` | 220 ms | varies | zeroed |
| `motion-morph` | Sidebar pill-morph (all geometry transitions) | 360 ms (`--morph-dur`) | `--morph-ease` `cubic-bezier(0.4, 0.8, 0.2, 1)` | zeroed |
| `anim-morph-content-out` | Sidebar scroll + footer fade-out (phased, before geometry) | 35% of `--morph-dur` (~126 ms) | `--ease-exit` | zeroed |
| `anim-morph-content-in` | Sidebar scroll + footer fade-in (phased, after geometry) | 40% of `--morph-dur` (~144 ms) | `--ease-standard`, delayed 55% of `--morph-dur` | zeroed |
| `anim-logo-collapse` | Logo "Markup." → "M." (max-width + opacity) | 50% of `--morph-dur` (~180 ms) out / 40% delay + fade in | `--ease-exit` (out), `--ease-standard` (in) | zeroed |
| `anim-scale-in` | Dialog/palette scale-in entrance | `--motion-fast` | `--ease-spring` | zeroed |
| `anim-toast-in` | Toast slide-in from bottom | `--motion-fast` | `--ease-standard` | zeroed |
| `anim-toast-out` | Toast slide-out | `--motion-fast` | `--ease-exit` | zeroed |
| `anim-popover-open` | Popover top-layer paint (`:popover-open`) — display flip; no entry animation (browser owns light-dismiss + ESC + single-active invariant) | instantaneous | N/A | N/A |
| `anim-chevron-rotate` | Tree chevron 0 deg → 90 deg smooth rotation | `--motion-fast` | `--ease-standard` | zeroed |
| `anim-kebab-swap` | Count badge → kebab icon swap on hover (count scales 0.8 + fades, kebab fades in) | `--motion-fast` | `--ease-standard` | zeroed |
| `anim-dnd-ghost-fade` | DnD ghost fade-out on drop | 80 ms | linear | zeroed |
| `anim-dnd-item-fadein` | DnD item fade-in at new position | 120 ms | linear | zeroed |
| `anim-dnd-springback` | DnD cancel spring-back | 180 ms | `--ease-spring` | zeroed |
| `anim-hover-lift` | Interactive element translateY(-1px) on hover | `--motion-fast` | `--ease-standard` | zeroed |
| `anim-active-press` | Interactive element translateY(1px) on mousedown | `--motion-fast` | `--ease-standard` | zeroed |
| `anim-palette-stagger` | Command palette results staggered entry | 20 ms delay per item | `--ease-standard` | zeroed |
| `anim-topbar-margin` | Topbar margin-left transition when sidebar collapses | `--morph-dur` | `--morph-ease` | zeroed |
| `mockup-viewer-zoom` | `transform: scale` on the iframe wrapper when zoom changes | instantaneous (no transition) | N/A | N/A |
| `sidebar-tree-active-scroll` | Smooth `scrollIntoView` on the active tree node when the URL changes | browser default smooth scroll | smooth | zeroed |

---

## Agent-loop surfaces

Surfaces that compose the agent automation cycle. These are API-driven but have user-visible counterparts in the UI.

| ID | Surface | User-visible in | API endpoint |
|---|---|---|---|
| `agent-annotation-create` | Annotation creation: JSON branch with `body` + `anchors[]` + `colorIndex` + `status` for comment-flow (drives `annotation-composer`); multipart branch with `screenshot` + `tldraw` + `pinCoords` retained for legacy/agent clients | `annotation-composer` (JSON branch); no UI for multipart branch | `POST /api/mockups/[id]/annotations` |
| `agent-intent-chip` | Intent type (visual/copy/behavior/other) persisted on the annotation. Comment-flow defaults to `other`; agents set explicitly via the multipart branch | N/A in current UI | persisted as `Annotation.intentType` |
| `agent-context-read` | Single-call context aggregator: annotation + intent + thread + inline source + diff_since_creation + project + folder_path. ETag for short-circuit | N/A (agent-only) | `GET /api/agent/context/[annotationId]` |
| `agent-intent-parse` | Server-side intent extraction: drawings → DOM-resolved bbox + computed styles. Sidecar cached as `intent.json`, keyed by `(tldraw_mtime, current_version_id)` | `annotation-detail-intent-badge` | `GET /api/annotations/[id]/intent` |
| `agent-version-patch` | Diff-based version update with `base_version_id`. Binary files reused by reference. 409 on conflict (stale base) | new version in `mockup-viewer-versions` | `PATCH /api/mockups/[id]/version-patch` |
| `agent-region-crop` | Bbox-cropped screenshot (sidecar-cached) | N/A (agent-only) | `GET /api/annotations/[id]/region` |
| `agent-diff-text` | Text-mode unified or JSON diff between versions | used by `diff-viewer` | `GET /api/mockups/[id]/diff` |
| `agent-tldraw-edit` | Drawing edit persistence. Deletes `intent.json` sidecar BEFORE writing new `tldraw.json` (cache invalidation ordering) | `annotation-detail-save-btn` | `PUT /api/annotations/[id]/tldraw` |
| `agent-thread-reply` | Agent replies in thread (`authorType: 'agent'`) | `thread-timeline-message` | `POST /api/threads/[id]/reply` |
| `agent-thread-resolve` | Thread resolution | `thread-timeline-resolve-btn` | `POST /api/threads/[id]/resolve` |

---

## Mockup serve surface

| ID | Surface | States |
|---|---|---|
| `mockup-serve` | Static file serving at `/m/[mockupId]/[...path]`. Only non-`/api` route reading from `${DATA_DIR}` | serves current version by default; `?v=<vid>` for specific version |
| `mockup-serve-iframe` | Iframe consumer of served files. Powers viewer and puppeteer intent resolution | loading, loaded, error (404 if version missing) |
