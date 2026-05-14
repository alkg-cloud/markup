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

Global 52 px top bar (`Topbar.tsx`). Present on all authenticated pages.

| ID | Surface / Interaction | States |
|---|---|---|
| `topbar-bar` | Fixed top bar with search pill, breadcrumbs, avatar | visible on all auth pages |
| `topbar-search-pill` | Search trigger pill opening Command Palette | default, hover, focus-visible, active |
| `topbar-avatar-btn` | User avatar button (top-right) | default, hover, focus-visible, active; opens avatar dropdown |
| `topbar-avatar-menu` | Dropdown from avatar button | closed, open; items: Settings, Agents, Logout |
| `topbar-breadcrumbs` | Breadcrumb navigation strip | see `breadcrumbs-*` entries below |

## sidebar

Collapsible sidebar shell (`Sidebar.tsx`). Present on `/projects/**` routes.

| ID | Surface / Interaction | States |
|---|---|---|
| `sidebar-shell` | Pill-morph sidebar container | expanded (280 px), collapsed (52 px); animates via `--morph-dur` / `--morph-ease` |
| `sidebar-collapse-toggle` | Toggle button to expand/collapse | default, hover, focus-visible, active |
| `sidebar-mobile-drawer` | `<dialog>` drawer on viewports < 768 px | closed, open; focus-trapped, scrim backdrop |
| `sidebar-mobile-hamburger` | Hamburger button to open mobile drawer | default, hover, focus-visible, active |
| `sidebar-footer` | Footer area with "New Project" button | visible when sidebar expanded |
| `sidebar-new-project-btn` | "+ New Project" button in footer | default, hover, focus-visible, active; opens `new-project-dialog` |

## sidebar-tree

ARIA tree widget for project/folder navigation (`ProjectTree.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `sidebar-tree-root` | `role="tree"` container | populated, empty (shows project empty state) |
| `sidebar-tree-project-item` | Project node in tree | default, hover, focus-visible, active, selected (accent bar) |
| `sidebar-tree-folder-item` | Folder node in tree | default, hover, focus-visible, active, selected |
| `sidebar-tree-mockup-item` | Mockup leaf node in tree | default, hover, focus-visible, active, selected |
| `sidebar-tree-expand` | Chevron expand/collapse on folder/project | collapsed (0deg), expanded (90deg); animates via `--motion-base` / `--ease-spring` |
| `sidebar-tree-keyboard-nav` | Full keyboard navigation | ArrowUp/Down (move focus), ArrowRight (expand), ArrowLeft (collapse), Enter/Space (activate), Home/End, Escape, Tab |
| `sidebar-tree-kebab` | Three-dot kebab menu on hover/focus | hidden (default), visible (hover/focus on tree item); opens dropdown |
| `sidebar-tree-kebab-menu` | Dropdown from kebab | items: Rename, Move to, Delete; danger variant on Delete |
| `sidebar-tree-count-badge` | Child-count badge on folders | shows count of direct children |
| `sidebar-tree-indent` | Visual indentation per nesting level | `--space-lg` per level up to 5 levels |
| `sidebar-tree-accent-bar` | 3 px left accent bar on selected item | visible when item is the current route |
| `sidebar-tree-truncation` | Long names truncated with ellipsis | `text-overflow: ellipsis`; full name in `title` tooltip |

## sidebar-tree-dnd

Drag-and-drop reordering within the sidebar tree (`useTreeDnD.ts`).

| ID | Surface / Interaction | States |
|---|---|---|
| `sidebar-tree-dnd-idle` | Default state | cursor: default, no ghost |
| `sidebar-tree-dnd-dragging` | Item being dragged | ghost clone at 60% opacity, original at 40% opacity, cursor: grabbing |
| `sidebar-tree-dnd-over-valid` | Ghost over valid drop zone | drop indicator line OR folder highlight border |
| `sidebar-tree-dnd-over-invalid` | Ghost over invalid drop zone | cursor: not-allowed |
| `sidebar-tree-dnd-dropped` | Item dropped on valid target | ghost fade-out (80 ms), item fade-in at new position (120 ms) |
| `sidebar-tree-dnd-cancelled` | Drag cancelled (Escape / mouseup outside) | ghost spring-back animation (`--ease-spring`, 180 ms) |
| `sidebar-tree-dnd-auto-expand` | Hovering closed folder for 600 ms | folder auto-expands to reveal drop targets |
| `sidebar-tree-dnd-keyboard` | Keyboard move mode | Space enters mode, Arrow moves item, Enter confirms, Escape cancels; `aria-live` announces position |
| `sidebar-tree-dnd-mobile-move` | "Move to..." context menu on < 768 px | long-press or kebab opens modal destination picker |

## sidebar-recents

Recents section in the sidebar (`RecentsSection.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `sidebar-recents-section` | "Recentes" region at project root | visible (>= 1 accessed mockup), hidden (no history); `role="region"` |
| `sidebar-recents-item` | Recent mockup link | default, hover, focus-visible; shows icon + name + relative timestamp |
| `sidebar-recents-empty` | Section not rendered when no history | N/A — section simply absent |

## sidebar-inline-folder-create

Inline folder creation input in the sidebar (`InlineFolderCreate.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `sidebar-folder-create-input` | Inline text input for folder name | idle, focused, error (duplicate name) |
| `sidebar-folder-create-confirm` | Enter key confirms creation | success: folder appears in tree; empty name: no action |
| `sidebar-folder-create-cancel` | Escape key cancels | input removed, no folder created |

## breadcrumbs

Structural breadcrumb navigation (`Breadcrumbs.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `breadcrumbs-nav` | `<nav>` with `<ol>` breadcrumb trail | visible inside projects; hidden at app root |
| `breadcrumbs-segment` | Clickable ancestor segment | default, hover, focus-visible; navigates to that level |
| `breadcrumbs-current` | Final segment (non-clickable) | `aria-current="page"`, plain text |
| `breadcrumbs-ellipsis` | Truncation `...` for long paths | clickable: expands full breadcrumb inline |
| `breadcrumbs-keyboard` | Tab into nav, ArrowLeft/Right between segments | Enter navigates |
| `breadcrumbs-mobile` | Aggressive truncation on < 768 px | shows current + `...` link to parent; tap expands as dropdown |

## command-palette

Global command palette (`CommandPalette.tsx`). Opens via `Cmd+K` / `Ctrl+K` or topbar search pill.

| ID | Surface / Interaction | States |
|---|---|---|
| `command-palette-trigger` | `Cmd+K` keyboard shortcut or search pill click | opens overlay |
| `command-palette-scrim` | Backdrop scrim with `backdrop-filter: blur(8px)` | visible when open; click dismisses |
| `command-palette-panel` | Glassmorphism search panel | scale-in animation on open |
| `command-palette-input` | Search text input with auto-focus | idle, typing (filters results live) |
| `command-palette-results` | Grouped result list (projects, folders, mockups) | populated, empty ("No results"), loading |
| `command-palette-result-item` | Individual result row | default, hover, focused (keyboard), selected |
| `command-palette-keyboard-nav` | ArrowUp/Down to move, Enter to select, Escape to close | full keyboard loop |
| `command-palette-dismiss` | Escape key or scrim click | panel scales out, scrim fades |

## new-project-dialog

New Project creation dialog (`NewProjectDialog.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `new-project-dialog-scrim` | Modal scrim backdrop | visible when open |
| `new-project-dialog-card` | Dialog card with scale-in animation | open, closed |
| `new-project-dialog-name-input` | Project name text field | idle, focused, error (empty on submit) |
| `new-project-dialog-icon-picker` | Icon picker trigger | opens `icon-picker` popover |
| `new-project-dialog-cancel` | Cancel button | default, hover, focus-visible |
| `new-project-dialog-create` | "Create" accent button | default, hover, focus-visible, active, disabled (submitting) |

## icon-picker

Tabbed icon picker popover (`IconPicker.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `icon-picker-popover` | Positioned popover container | open, closed |
| `icon-picker-tabs` | Category tabs (Code / Brands / UI / Emoji) | default, active tab |
| `icon-picker-search` | Search input within picker | idle, typing (filters icons) |
| `icon-picker-grid` | 8-column icon grid | populated, empty (no matches) |
| `icon-picker-cell` | Individual icon cell | default, hover, selected |
| `icon-picker-footer` | Mono-font preview of selected icon token | shows current selection |

## project-content

Main content area for project and folder views (`ProjectContent.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `project-content-toolbar` | Toolbar with view controls | visible at top of content area |
| `project-content-grid` | Card grid of folders + mockups | populated, empty (shows empty state) |
| `project-content-responsive` | Responsive layout | sidebar + main on desktop (>= 768 px), single column on mobile |

## folder-card

Folder card in the content grid (`FolderCard.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `folder-card` | Card with folder icon, name, metadata | default, hover (lift), focus-visible |
| `folder-card-icon` | SVG folder icon | static |
| `folder-card-name` | Folder name text | truncated if long |
| `folder-card-meta` | Child count / metadata line | text-dim color |

## empty-state

Empty state component for projects and folders (`EmptyState.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `empty-state-project` | Empty project state (no mockups, no folders) | icon + "Nenhum mockup ainda" + CTAs |
| `empty-state-folder` | Empty folder state | icon + "Pasta vazia" + CTAs |
| `empty-state-cta-primary` | "Fazer upload de mockup" accent button | default, hover, focus-visible, active |
| `empty-state-cta-secondary` | "Criar pasta" / "Criar subpasta" secondary button | default, hover, focus-visible, active |
| `empty-state-sidebar-inline` | Inline "Pasta vazia" text in sidebar | shown below empty expanded folder |

## mockup-list

Legacy mockup list page at `/mockups` (card grid).

| ID | Surface / Interaction | States |
|---|---|---|
| `mockup-list-grid` | Card grid of all mockups | populated, empty |
| `mockup-list-card` | Individual mockup card (`MockupCard.tsx`) | default, hover (lift + shadow), focus-visible |
| `mockup-list-card-thumb` | Thumbnail image (PNG from `/api/mockups/[id]/thumbnail`) | loaded, fallback (deterministic monogram with palette-cycled hue) |
| `mockup-list-card-badge` | Status badge on card | open (default), resolved, archived |
| `mockup-list-card-name` | Mockup name text | truncated if long |

## mockup-viewer

Mockup viewer page at `/mockups/[id]` (`MockupViewer.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `mockup-viewer-iframe` | Iframe rendering the current version via `/m/[id]/...` | loading, loaded, error |
| `mockup-viewer-pin-overlay` | Pin overlay layer on top of iframe | pins rendered at scroll-relative coordinates |
| `mockup-viewer-pin` | Individual annotation pin (`AnnotationPin.tsx`) | default, hover (scale-up + glow), focus-visible (ring on outer `<a>`), active |
| `mockup-viewer-pin-number` | Numbered teardrop badge | sequential numbering |
| `mockup-viewer-pin-cluster` | Future: grouped pins when >= 3 within 60 px radius | not yet implemented (see future-features #2) |
| `mockup-viewer-sidebar` | Annotation list sidebar panel | populated (annotation list), empty |
| `mockup-viewer-versions` | Version list in sidebar (`Versions.tsx`) | shows version history with timestamps |
| `mockup-viewer-add-comment` | "+ Comment" button | default, hover, focus-visible, active; opens `annotation-modal` |

## annotation-modal

Annotation creation modal (`AnnotationModal.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `annotation-modal-scrim` | Backdrop scrim | visible when modal open |
| `annotation-modal-canvas` | Tldraw drawing canvas over screenshot | editable; see `tldraw-canvas-*` entries |
| `annotation-modal-chip-strip` | Intent chip selector strip | chips: visual, copy, behavior, other; one active at a time; default: other |
| `annotation-modal-chip` | Individual intent chip | default, hover, focus-visible, active (selected) |
| `annotation-modal-textarea` | Comment textarea | idle, focused, filled |
| `annotation-modal-submit` | "Save" / submit button | default, hover, focus-visible, active, disabled (empty comment) |
| `annotation-modal-cancel` | Cancel / close button | default, hover, focus-visible |

## tldraw-canvas

Tldraw wrapper component (`AnnotationCanvas.tsx`). Used in annotation modal and annotation detail.

| ID | Surface / Interaction | States |
|---|---|---|
| `tldraw-canvas-container` | Aspect-ratio container matching screenshot dimensions | sized via `aspectRatio: width / height` from PNG IHDR |
| `tldraw-canvas-screenshot` | Screenshot image shape locked at (0,0) | base64 stripped on save, rehydrated on load |
| `tldraw-canvas-toolbar` | Tldraw drawing toolbar | visible in edit mode, hidden in read-only |
| `tldraw-canvas-shapes` | User-drawn shapes (geo, arrow, text, draw, image) | persisted to `tldraw.json` sidecar |
| `tldraw-canvas-readonly` | Read-only mode | toolbar hidden, shapes locked |
| `tldraw-canvas-edit-mode` | Edit mode | toolbar visible, shapes editable |
| `tldraw-canvas-watermark` | Tldraw eval license watermark | bottom-right "Get a license for production" (see future-features #14) |

## annotation-detail

Annotation detail page at `/annotations/[id]` (`ReadOnlyAnnotation.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `annotation-detail-canvas` | Tldraw canvas with existing drawing | starts read-only |
| `annotation-detail-edit-btn` | "Edit drawings" toggle button | default, hover, focus-visible; flips canvas to edit mode |
| `annotation-detail-save-btn` | "Save" button (edit mode) | default, hover, focus-visible, active; PUTs to `/api/annotations/[id]/tldraw` |
| `annotation-detail-thread` | Thread timeline below canvas | see `thread-timeline-*` entries |
| `annotation-detail-intent-badge` | Intent type badge (visual/copy/behavior/other) | static display |

## thread-timeline

Message timeline component (`ThreadTimeline.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `thread-timeline-list` | Chronological message list | populated (>= 1 message) |
| `thread-timeline-message` | Individual message bubble | user message (avatar + body), agent message (avatar + body) |
| `thread-timeline-avatar` | Author avatar chip | user: initials, agent: bot icon |
| `thread-timeline-body` | Message text body | rendered markdown |
| `thread-timeline-timestamp` | Message timestamp | tabular-nums, relative time |
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

Agent token management page at `/settings/agents` (`AgentsClient.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `settings-agents-list` | Table/list of existing agent tokens | populated, empty |
| `settings-agents-token-row` | Individual token row | name, created date, last used; shows revoke action |
| `settings-agents-create-btn` | "Create token" button | default, hover, focus-visible, active |
| `settings-agents-create-form` | Token creation form (name input) | idle, submitting |
| `settings-agents-plaintext` | One-time plaintext token display | shown once after creation, copyable |
| `settings-agents-revoke-btn` | Revoke/delete button per token | default, hover, focus-visible; danger variant |
| `settings-agents-revoke-confirm` | Delete confirmation (if any) | confirm/cancel |

## dialog

Reusable modal dialog (`Dialog.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `dialog-scrim` | Backdrop scrim overlay | visible when dialog open; click outside dismisses |
| `dialog-card` | Dialog card container | scale-in animation on open |
| `dialog-title` | Title text | static |
| `dialog-field` | Form field wrapper (label + input) | idle, focused, error |
| `dialog-actions` | Actions row (cancel + confirm buttons) | standard layout |

## dropdown

Positioned popover menu (`Dropdown.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `dropdown-menu` | Popover menu container | open, closed; spring animation on open |
| `dropdown-item` | Menu item | default, hover, focus-visible |
| `dropdown-item-danger` | Danger-variant menu item (e.g. Delete) | default, hover (danger bg), focus-visible |
| `dropdown-divider` | Horizontal divider between item groups | static |

## toast

Toast notification system (`Toast.tsx`, `useToast.ts`).

| ID | Surface / Interaction | States |
|---|---|---|
| `toast-container` | Fixed bottom-center container | positioned absolutely |
| `toast-pill` | Individual toast message pill | success, error, warning, info variants; slide-in animation, auto-dismiss |
| `toast-reduced-motion` | Reduced motion override | animation zeroed via `prefers-reduced-motion` |

## app-nav

Top navigation pills (`AppNav.tsx`). "Mockups | Agents" pill group.

| ID | Surface / Interaction | States |
|---|---|---|
| `app-nav-pills` | Pill navigation group | visible on authenticated pages |
| `app-nav-pill` | Individual nav pill link | default, hover, focus-visible, active (current route) |

## statusbar

Bottom status bar (`Statusbar.tsx`). 24 px bar with project stats.

| ID | Surface / Interaction | States |
|---|---|---|
| `statusbar-bar` | Fixed bottom bar | visible on project pages |
| `statusbar-segment` | Stat segment (mockup count, annotation count, etc.) | static text |

---

## Global surfaces

Cross-cutting visual and interaction surfaces defined in `globals.css` and `tokens.css`.

| ID | Surface / Interaction | States |
|---|---|---|
| `global-atmospheric-mesh` | Body background radial gradients + linear tint | fixed, z-index 0; teal-tinted dark canvas |
| `global-focus-ring` | `:focus-visible` box-shadow ring | 2 px gap + 2 px accent ring on every interactive element |
| `global-scrollbar` | Thin scrollbar with accent-tinted thumb | default, hover (thumb brightens to accent 50%) |
| `global-selection` | `::selection` highlight | accent bg at 32% opacity, bright text |
| `global-reduced-motion` | `prefers-reduced-motion: reduce` safety net | all animations/transitions zeroed via `!important` |
| `global-typography-manrope` | Manrope font family (body + display) | weights 400-800 |
| `global-typography-jetbrains` | JetBrains Mono (code/tabular) | monospace, tabular-nums |

---

## Animation inventory

All motion tokens and keyframe animations.

| ID | Token / Animation | Duration | Easing | Reduced-motion override |
|---|---|---|---|---|
| `motion-instant` | `--motion-instant` | 90 ms | `--ease-standard` | zeroed |
| `motion-fast` | `--motion-fast` | 160 ms | `--ease-standard` | zeroed |
| `motion-base` | `--motion-base` | 220 ms | varies | zeroed |
| `motion-morph` | Sidebar pill-morph | 360 ms | `--morph-ease` | zeroed |
| `anim-scale-in` | Dialog/palette scale-in entrance | `--motion-fast` | `--ease-spring` | zeroed |
| `anim-toast-in` | Toast slide-in from bottom | `--motion-fast` | `--ease-standard` | zeroed |
| `anim-toast-out` | Toast slide-out | `--motion-fast` | `--ease-exit` | zeroed |
| `anim-dropdown-spring` | Dropdown menu spring entrance | `--motion-fast` | `--ease-spring` | zeroed |
| `anim-chevron-rotate` | Tree chevron 0deg-90deg rotation | `--motion-base` | `--ease-spring` | zeroed |
| `anim-dnd-ghost-fade` | DnD ghost fade-out on drop | 80 ms | linear | zeroed |
| `anim-dnd-item-fadein` | DnD item fade-in at new position | 120 ms | linear | zeroed |
| `anim-dnd-springback` | DnD cancel spring-back | 180 ms | `--ease-spring` | zeroed |
| `anim-hover-lift` | Interactive element translateY(-1px) on hover | `--motion-fast` | `--ease-standard` | zeroed |
| `anim-active-press` | Interactive element translateY(1px) on mousedown | `--motion-fast` | `--ease-standard` | zeroed |

---

## Agent-loop surfaces

Surfaces that compose the agent automation cycle. These are API-driven but have user-visible counterparts in the UI.

| ID | Surface | User-visible in | API endpoint |
|---|---|---|---|
| `agent-annotation-create` | Annotation creation with screenshot + tldraw + intent chip | `annotation-modal` | `POST /api/mockups/[id]/annotations` |
| `agent-intent-chip` | G1 intent type selector (visual/copy/behavior/other) | `annotation-modal-chip-strip` | persisted as `Annotation.intentType` |
| `agent-context-read` | Single-call context aggregator | N/A (agent-only) | `GET /api/agent/context/[annotationId]` |
| `agent-intent-parse` | Server-side intent extraction (drawings + DOM bbox) | `annotation-detail-intent-badge` | `GET /api/annotations/[id]/intent` |
| `agent-version-patch` | Diff-based version update | new version appears in `mockup-viewer-versions` | `PATCH /api/mockups/[id]/version-patch` |
| `agent-region-crop` | Bbox-cropped screenshot | N/A (agent-only) | `GET /api/annotations/[id]/region` |
| `agent-diff-text` | Text-mode diff between versions | used by `diff-viewer` | `GET /api/mockups/[id]/diff` |
| `agent-tldraw-edit` | Drawing edit persistence | `annotation-detail-save-btn` | `PUT /api/annotations/[id]/tldraw` |
| `agent-thread-reply` | Agent replies in thread | `thread-timeline-message` | `POST /api/threads/[id]/reply` |
| `agent-thread-resolve` | Thread resolution | `thread-timeline-resolve-btn` | `POST /api/threads/[id]/resolve` |

---

## Mockup serve surface

| ID | Surface | States |
|---|---|---|
| `mockup-serve` | Static file serving at `/m/[mockupId]/[...path]` | serves current version by default; `?v=<vid>` for specific version |
| `mockup-serve-iframe` | Iframe consumer of served files | loading, loaded, error (404 if version missing) |
