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
| `topbar-avatar-btn` | User avatar button (top-right), 32 px circle with initials | default, hover (border-color accent), focus-visible, active; opens avatar dropdown |
| `topbar-avatar-menu` | Dropdown from avatar button; two items only: **Agent Tokens** (navigates to `/settings/agents`) and **Sign Out** (danger variant). Settings and Notifications are not shipped. | closed, open; spring animation |
| `topbar-breadcrumbs` | Breadcrumb strip — starts at project name (no "Markup" / "Home" prefix). Logo serves as root navigation | see `breadcrumbs-*` entries |

## sidebar

Collapsible sidebar shell (`Sidebar.tsx`). Present on authenticated workspace routes (`/`, `/settings/agents`, mockup viewer, annotation detail). The sidebar morphs into a floating pill when collapsed.

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
| `sidebar-tree-kebab` | Three-dot kebab icon. Replaces count badge on hover with animated swap (count scales to 0.8 and fades out, kebab fades in simultaneously) | hidden (default), visible (hover/focus); opens dropdown |
| `sidebar-tree-kebab-menu` | Dropdown from project kebab: **Open**, **Edit** (opens project update dialog with current values), **New folder** (top-level folder under the project via `POST /api/projects/[id]/folders` with `parentId: null`), **Delete project**. Folder kebab: **Open**, **Rename** (inline input in the row), **New subfolder**, **Delete folder**. Mockup kebab: **Open**, **Rename**, **Delete mockup**. | open, closed; spring animation on open and close |
| `sidebar-tree-count-badge` | Child-count badge on folders/projects. Swaps out for kebab on hover | visible (no hover), hidden (hover — replaced by kebab) |
| `sidebar-tree-indent` | Visual indentation per nesting level (tree-indent-1 through tree-indent-4) | up to 5 nesting levels |
| `sidebar-tree-accent-bar` | 3 px left accent bar on selected item | visible when item is the current route |
| `sidebar-tree-truncation` | Long names truncated with `text-overflow: ellipsis` | full name in `title` tooltip |
| `sidebar-tree-no-project-section` | Section header `NO PROJECT` groups mockups without a project; rendered only when at least one orphan mockup exists. Replaces the prior synthetic `Ungrouped` pseudo-project node. Orphan mockup rows are full treeitems — clickable (navigates to `/mockups/{id}`), Enter/Space activate, and they get `aria-selected` + the active style when the URL matches. | expanded, collapsed; active when URL matches one of its leaves |
| `sidebar-section-headers` | Section headers `PROJECTS` and `NO PROJECT` divide the sidebar tree. Sticky to the top of the scroll container. | visible, hidden (NO PROJECT hidden when no orphan mockups) |
| `sidebar-tree-persist-on-nav` | Expand/collapse state of every project and folder node survives navigation between in-shell pages (`/`, `/mockups/[id]`, `/annotations/[id]`, `/settings/agents`) because the shell mounts once in the `(app)` route-group layout | preserved on client-side navigation |
| `sidebar-tree-persist-expansion` | Tree expansion (which projects/folders are open) is persisted in `localStorage.markup.sidebar.expanded` (JSON array of node IDs). Survives reload and tab close. Auto-expand of the active node's path on mount remains additive. | persisted across reloads |
| `sidebar-tree-active-scroll` | When the URL changes (soft-nav), the active tree node is scrolled into view via `scrollIntoView({block:'nearest', behavior:'smooth'})`. | triggered on every soft-navigation |
| `sidebar-tree-cursor-grab` | Draggable mockup leaves show `cursor: grab` on hover and `cursor: grabbing` on mousedown. | hover, mousedown |
| `sidebar-tree-active-path` | On mount and on every navigation, the chain of ancestors leading to the currently visible surface is auto-expanded so the active node is in view: the project + every parent folder for `/mockups/[id]` and `/annotations/[id]`, the project + the parent folder for `/?project=slug&folder=id`, the project for `/?project=slug`. Already-expanded nodes are never collapsed by this behaviour | active mockup, active folder, active project |

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
| `sidebar-folder-create-input` | Inline text input for folder name. Placeholder: "Nome da pasta" | idle, focused, error (duplicate name: "Já existe uma pasta com esse nome aqui.") |
| `sidebar-folder-create-confirm` | Enter key confirms creation | success: folder appears in tree; empty name: no action, focus stays |
| `sidebar-folder-create-cancel` | Escape key cancels | input removed, no folder created |
| `sidebar-folder-create-maxlen` | Names > 255 chars truncated silently | no visible error |

## breadcrumbs

Structural breadcrumb navigation (`Breadcrumbs.tsx`). No "Markup" or "Home" prefix — the clickable logo handles root navigation. Breadcrumb starts with the project name: `{project} › {folder} › {mockup}`. The mockup viewer renders the full ancestor chain (`/mockups/[id]/page.tsx` walks the `Folder.parentId` ancestry server-side). The settings page (`/settings/agents`) intentionally renders an empty breadcrumb — the page's own h1 carries the label and would be redundant.

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
| `command-palette-trigger` | `Ctrl+K` on Windows/Linux, `⌘K` on Apple platforms, or search pill click. The shortcut and search pill dispatch an `open-command-palette` custom event on `document`; `CommandPalette` listens for this event to open. Other overlays (e.g. the Topbar avatar dropdown) also listen and close themselves so no two overlays coexist. | opens overlay |
| `command-palette-scrim` | Backdrop scrim with `backdrop-filter: blur(8px)`, `--scrim-strong` | visible when open; click dismisses |
| `command-palette-panel` | Glassmorphism dark panel with `--shadow-glow` signature, `--bg-elevated` bg, `--border` border | scale-in animation on open, positioned top-center |
| `command-palette-input` | Search text input with VscSearch icon, auto-focus. Matching text highlighted with `<mark>` (accent-overlay-mid bg, accent-bright text) | idle, typing (filters results live, staggered 20 ms entry animation per result) |
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
| `new-project-dialog-name-input` | Project name text field | idle, focused, error (empty on submit) |
| `new-project-dialog-icon-picker` | Embedded icon picker (same component as project kebab "Change icon") | shows `icon-picker` inline in dialog |
| `new-project-dialog-labels` | Field labels render in ALL-CAPS (`PROJECT NAME`, `ICON`). Primary action button is `Create Project` in create mode and `Update Project` in edit mode. Name input placeholder is `My Project`. | create mode, edit mode |
| `new-project-dialog-cancel` | Cancel button (`btn-secondary`) | default, hover, focus-visible |
| `new-project-dialog-create` | `Create Project` accent button in create mode, `Update Project` in edit mode | default, hover (`--accent-bright`), focus-visible, active, disabled (submitting) |

## edit-project-dialog

Project update dialog (`NewProjectDialog.tsx` in edit mode).

| ID | Surface / Interaction | States |
|---|---|---|
| `edit-project-dialog-card` | Dialog card matching New Project, prefilled with current project name and icon | open, closed |
| `edit-project-dialog-name-input` | Project name text field | idle, focused, error (empty on submit) |
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

Mockup viewer page at `/mockups/[id]` (`MockupViewer.tsx`) inside the standard sidebar + topbar shell.

| ID | Surface / Interaction | States |
|---|---|---|
| `mockup-viewer-iframe` | Iframe rendering the current version via `/m/[id]/...` | loading, loaded, error |
| `mockup-viewer-pin-overlay` | Pin overlay layer on top of iframe | pins rendered at scroll-relative coordinates |
| `mockup-viewer-pin` | Individual annotation pin (`AnnotationPin.tsx`). Teardrop shape rotated -45 deg on child `<span>`, focus ring on outer `<a>` (axis-aligned) | default, hover (scale-up + glow), focus-visible (ring on outer `<a>`), active |
| `mockup-viewer-pin-number` | Sequential number inside teardrop badge | sequential numbering |
| `mockup-viewer-sidebar` | Annotation list sidebar panel | populated (annotation list), empty |
| `mockup-viewer-versions` | Version list in sidebar (`Versions.tsx`) with promote action and timestamps | shows version history, promote button per version |
| `mockup-viewer-toolbar` | Toolbar below the mockup-viewer title with nine controls: edit-mode toggle (`VscEdit`), comment-mode toggle (`VscComment`), zoom out (`VscRemove`), zoom % label, zoom in (`VscAdd`), fullscreen (`VscScreenFull`), history toggle (`VscHistory`), version pill (`v{N}` + `VscChevronDown`), view-diff button (`VscDiff`). All icons are VSCode codicons via `react-icons/vsc` per the icon-system rule in `docs/frontend/styling.md`. Zoom clamps to 25–400% and applies `transform: scale()` to the iframe wrapper. Fullscreen calls `requestFullscreen()` on the wrapper. History toggles the side Versions panel. Diff opens a modal with the unified diff between previous and current version (`Nothing to compare yet.` if only one version exists). | edit mode, comment mode; zoom 25–400% |
| `mockup-viewer-add-comment` | "+ Comment" button | default, hover, focus-visible, active; captures iframe screenshot + opens `annotation-modal` |

## annotation-modal

Annotation creation modal (`AnnotationModal.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `annotation-modal-scrim` | Backdrop scrim | visible when modal open |
| `annotation-modal-canvas` | Tldraw drawing canvas over captured screenshot | editable; see `tldraw-canvas-*` entries |
| `annotation-modal-chip-strip` | Intent chip selector strip below canvas | chips: visual, copy, behavior, other; one active at a time; default: other |
| `annotation-modal-chip` | Individual intent chip. Colors: **visual** (accent-overlay-soft bg, accent-bright fg), **copy** (info-soft bg, info fg), **behavior** (warning-soft bg, warning fg), **other** (bg-elevated bg, text-dim fg) | default, hover, focus-visible, active (selected — flat fill) |
| `annotation-modal-textarea` | Comment textarea | idle, focused, filled |
| `annotation-modal-submit` | "Save" / submit button | default, hover, focus-visible, active, disabled (empty comment or saving) |
| `annotation-modal-cancel` | Cancel / close button | default, hover, focus-visible |

## tldraw-canvas

Tldraw wrapper component (`AnnotationCanvas.tsx`). Used in annotation modal and annotation detail.

| ID | Surface / Interaction | States |
|---|---|---|
| `tldraw-canvas-container` | Aspect-ratio container matching screenshot dimensions | sized via `aspectRatio: width / height` from PNG IHDR |
| `tldraw-canvas-screenshot` | Screenshot image shape locked at (0,0). Base64 stripped at save (replaced with `asset.meta.externalRef = 'screenshot'` marker), rehydrated at load from `/api/annotations/[id]/screenshot` | on-disk tldraw.json: 2-5 KB (not 640 KB+) |
| `tldraw-canvas-toolbar` | Tldraw drawing toolbar | visible in edit mode, hidden in read-only |
| `tldraw-canvas-shapes` | User-drawn shapes: geo (rectangles, ellipses), arrow (from/to), text (rich-text flattened), draw (freehand pencil), image (user pastes) | persisted to `tldraw.json` sidecar |
| `tldraw-canvas-readonly` | Read-only mode | toolbar hidden, shapes locked, `isReadonly: true` |
| `tldraw-canvas-edit-mode` | Edit mode | toolbar visible, shapes editable |
| `tldraw-canvas-strictmode` | StrictMode dedup guard — checks for existing screenshot asset before creating. Idempotent across remounts | prevents duplicate screenshot shapes |
| `tldraw-canvas-watermark` | Tldraw eval license watermark | bottom-right "Get a license for production" (see future-features #14) |

## annotation-detail

Annotation detail page at `/annotations/[id]` (`ReadOnlyAnnotation.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `annotation-detail-canvas` | Tldraw canvas with existing drawing | starts read-only |
| `annotation-detail-edit-btn` | "Edit drawings" toggle button | default, hover, focus-visible; flips canvas to edit mode |
| `annotation-detail-save-btn` | "Save" button (edit mode). PUTs `editor.getSnapshot()` to `/api/annotations/[id]/tldraw`. Save deletes `intent.json` sidecar before writing new `tldraw.json` (cache invalidation) | default, hover, focus-visible, active |
| `annotation-detail-thread` | Thread timeline below canvas | see `thread-timeline-*` entries |
| `annotation-detail-intent-badge` | Intent type badge (visual/copy/behavior/other) with colored pill | static display |

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
| `settings-agents-revoke-btn` | Revoke icon button per token card | default, hover (`--danger-soft` bg + `--danger` color), focus-visible; shows confirmation dialog before deletion |

## dialog

Reusable modal dialog (`Dialog.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `dialog-scrim` | Backdrop scrim overlay with `backdrop-filter: blur(20px)` | visible when dialog open; click outside dismisses |
| `dialog-card` | Dialog card container | scale-in animation on open |
| `dialog-title` | Title text | static |
| `dialog-field` | Form field wrapper (label + input) | idle, focused, error |
| `dialog-actions` | Actions row: cancel (`btn-secondary`) + confirm (`btn-accent`) | standard layout |

## dropdown

Positioned popover menu (`Dropdown.tsx`). All dropdowns have open AND close animation.

| ID | Surface / Interaction | States |
|---|---|---|
| `dropdown-menu` | Popover menu container | open (spring animation), closed (exit animation); both open and close are animated |
| `dropdown-item` | Menu item | default, hover (`--surface-hover`), focus-visible |
| `dropdown-item-danger` | Danger-variant menu item (e.g. Delete, Sign out) | default, hover (`--danger-soft` bg + `--danger` text), focus-visible |
| `dropdown-divider` | Horizontal divider between item groups | 1 px `--border-subtle`, 4 px margin |

## toast

Toast notification system (`Toast.tsx`, `useToast.ts`).

| ID | Surface / Interaction | States |
|---|---|---|
| `toast-container` | Fixed bottom-center container | positioned absolutely |
| `toast-pill` | Individual toast message pill | success, error, warning, info variants; slide-in animation, auto-dismiss |
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
| `anim-dropdown-open` | Dropdown menu spring entrance | `--motion-fast` | `--ease-spring` | zeroed |
| `anim-dropdown-close` | Dropdown menu exit | `--motion-fast` | `--ease-exit` | zeroed |
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
| `agent-annotation-create` | Annotation creation with screenshot + tldraw + intent chip + pinCoords | `annotation-modal` | `POST /api/mockups/[id]/annotations` |
| `agent-intent-chip` | G1 intent type selector (visual/copy/behavior/other) | `annotation-modal-chip-strip` | persisted as `Annotation.intentType` |
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
