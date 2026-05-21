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
| `topbar-search-pill` | Search trigger pill centered in topbar (min 240 px, max 340 px) with VscSearch icon + "Search..." text + a `<Kbd keys={['mod','k']} />` chip (platform-aware keycap rendering). `aria-label` includes OS-aware plain-text shortcut hint via `formatShortcut`. | default, hover (border brightens to `--border-strong`, bg to `--surface-hover`), focus-visible, active; opens `command-palette` and closes avatar dropdown |
| `topbar-avatar-btn` | User avatar button (top-right), 32 px circle with initials | default, hover (border-color accent), focus-visible, active; opens `topbar-avatar-menu` via `usePopover` |
| `topbar-avatar-menu` | Native HTML popover (`popover="auto"`) anchored to `topbar-avatar-btn` via `usePopover('right')`. Layout for **admin** users: an `Admin` subheading (10 px mono uppercase, 0.12em tracking, `--text-muted`, 6 px / 14 px padding) followed by **Invites** (navigates to `/settings/invites`) and **Agent Tokens** (navigates to `/settings/agents`); a divider; then **Sign Out** (danger variant). Layout for **member** users hides the entire Admin group (subheading + both items) — they see only **Sign Out**. Settings and Notifications items are not shipped. Paints in the browser top-layer — light-dismiss + ESC handled natively. Closes automatically when `command-palette` opens. | closed, open; admin view (full menu), member view (only Sign Out) |
| `topbar-breadcrumbs` | Breadcrumb strip — starts at project name (no "Markup" / "Home" prefix). Logo serves as root navigation | see `breadcrumbs-*` entries |

## sidebar

Collapsible sidebar shell (`Sidebar.tsx`). Present on every authenticated workspace route — the `home` dashboard at `/`, `/projects/<slug>` (and nested folders / mockups), `/annotations/[id]`, and `/settings/agents`. The sidebar morphs into a floating pill when collapsed.

| ID | Surface / Interaction | States |
|---|---|---|
| `sidebar-shell` | Fixed sidebar container that morphs between expanded (280 px full-height) and collapsed (84 x 40 px floating pill at top-left). Collapse state persists across project, folder, mockup, settings, and annotation navigations in the same browser. Transitions: width, height, top, left, border-radius, border-color, box-shadow — all via `--morph-dur` (360 ms) / `--morph-ease` | expanded, collapsed (pill) |
| `sidebar-header` | Header with logo + collapse button. Shrinks to pill size when collapsed (height matches `--pill-height`). Logo and toggle always visible in both states | expanded (full width), collapsed (pill-sized) |
| `sidebar-logo` | "Markup." text with capital M, accent-green dot. Animates to "M." on collapse via `max-width` + opacity transition. Full text fades out at 50% of morph-dur (ease-exit), fades in with 40% delay on expand (ease-standard) | expanded ("Markup."), collapsed ("M.") |
| `sidebar-collapse-toggle` | Toggle button to expand/collapse. Icon changes: VscLayoutSidebarLeftOff (expanded) → VscLayoutSidebarLeft (collapsed). Height: 14 px. Remains visible as floating button next to logo in collapsed state | default, hover (`--surface-hover` bg), focus-visible, active |
| `sidebar-scroll` | Scrollable tree area. Phased fade: opacity fades out at 35% of morph-dur (ease-exit) before geometry morphs. On expand, fades in at 55% delay. `pointer-events: none` + `overflow: hidden` when collapsed | visible (expanded), hidden (collapsed) |
| `sidebar-footer` | Footer with "+ New Mockup" pill (replaces the former "+ New Project" CTA — project creation moves to `sidebar-projects-header`'s `+`). Same phased fade as scroll area | visible (expanded), hidden (collapsed) |
| `sidebar-new-mockup-btn` | "+ New Mockup" pill in footer. Accent text on `--btn-bg`, `--radius-pill`. Tooltip `Upload mockup · Ctrl+U`. Opens the OS file picker; on selection routes to `new-mockup-dialog` | default, hover (`--btn-bg-hover` bg, `--accent-overlay-mid` border, `--accent-bright` text), focus-visible, active |
| `sidebar-pill-position` | Collapsed pill position: `--pill-top: 5px`, `--pill-left: 5px` | pill has border-radius pill, elevated shadow, translucent bg with backdrop-filter |
| `sidebar-mobile-drawer` | `<dialog>` drawer on viewports < 768 px | closed, open; focus-trapped, scrim backdrop |
| `sidebar-mobile-hamburger` | Hamburger button to open mobile drawer | default, hover, focus-visible, active |

## sidebar-projects-header

Fixed-top "Projects" pill header inside the sidebar — replaces the prior inline `PROJECTS` section label. 32 px tall, mono uppercase, `--text-muted`, sits in a `--bg-card` pill with `--border-subtle`. The header is the single anchor for the section + the home of the project-creation `+` affordance, freeing the footer for the new-mockup CTA.

| ID | Surface / Interaction | States |
|---|---|---|
| `sidebar-projects-header` | "Projects" pill at the top of the sidebar scroll area. 32 px tall, mono uppercase 11 px / 700, letter-spacing 0.12em, `--text-muted`. Three placement strategies share the same visual surface — only the scroll relationship differs | rendered above the tree on every workspace route; hidden when sidebar is collapsed (phased fade with `sidebar-scroll`) |
| `sidebar-projects-header-sticky-top` | Default — header is `position: sticky; top: 0` inside the sidebar scroll, so it scrolls with the first batch then locks at the top | default placement; collapses with the scroll fade |
| `sidebar-projects-header-plus-button` | 22 × 22 `+` icon button on the right of the pill. `--text-dim` idle, `--accent` on hover. Tooltip `New project · Ctrl+Shift+P`. Opens `new-project-dialog` in the `footer-button` and `sticky-top` variants; opens a 2-item action menu in the `header-plus` and `both` CTA placements | default, hover (`--surface-hover` bg + `--accent` text), focus-visible, active, menu-open (sticky `--accent-overlay-soft` bg) |
| `sidebar-projects-header-sempre-visivel` | Header rendered outside the scroll container — truly fixed via the sidebar's flex layout. The scroll never overlays the header | always visible; no sticky behaviour |
| `sidebar-projects-header-sticky-pill` | Variant — header is a floating glass pill (`--surface-glass-bg` + `blur(16px) saturate(140%)`, `--border` border) layered over the scroll area; scroll content slides under it | float over scroll; glass surface |
| `sidebar-projects-inline-label` | Current implementation — `Projects` label rendered inline inside the sidebar scroll content (not sticky, not floating), paired with an inline `+` button (`inlinePlusBtn`) that opens `new-project-dialog`. The inline placement is what ships today; the sticky/pill placements above remain documented variants. | idle, hover (on `+` opens `new-project-dialog`), focused |

## sidebar-new-mockup-cta

The "+ New Mockup" affordance — the upload entry point reachable from the sidebar. Three placement strategies determine whether it lives in the footer, in the Projects header `+`, or in both.

| ID | Surface / Interaction | States |
|---|---|---|
| `sidebar-new-mockup-cta` | Footer button in `ProjectSidebar` that opens the OS file picker; on selection routes to `new-mockup-dialog`. Three placement variants below decide where (footer / header `+` / both). | idle, hover, focused, file-picker-open |
| `sidebar-new-mockup-cta-footer` | Default — footer pill button (`sidebar-new-mockup-btn`). Opens the OS file picker; on selection routes to `new-mockup-dialog`. Shortcut `Ctrl+U` (or `⌘U` on Apple). The footer is the canonical home of the CTA | default, hover, focus-visible, active |
| `sidebar-new-mockup-cta-header-plus` | The Projects pill `+` opens a 2-item action menu — **New project** (opens `new-project-dialog`) and **New mockup** (opens the file picker). The footer pill is hidden in this placement | menu closed, menu open (popover) |
| `sidebar-new-mockup-cta-both` | The footer pill is present AND the header `+` opens the 2-item menu — redundant, both paths shipped | both visible |

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
| `sidebar-tree-kebab-menu` | Native HTML popover (`popover="auto"`) anchored to the row's kebab via the `TreeNodeKebab` subcomponent's `usePopover('right')`. Project kebab: **Open**, **Edit** (opens project update dialog with current values), **New folder** (top-level folder under the project via `POST /api/projects/[id]/folders` with `parentId: null`), **Delete**. Folder kebab: **Open**, **Rename** (inline input in the row), **New subfolder**, **Delete**. Mockup kebab: **Open**, **Rename**, **Delete**. The Delete item is a danger-styled label dropped of its redundant noun — the kebab is already scoped to a specific row, so `aria-label` retains the noun + row name for assistive tech (e.g. `Delete project Lumen Coffee`). Selecting Delete opens a `confirm-dialog` quoting the noun and the row's name; only on accept does the client fire `DELETE /api/projects/[id]` / `DELETE /api/folders/[id]` / `DELETE /api/mockups/[id]`. Top-layer paint — escapes the sidebar's `overflow-y: auto` so the menu is never clipped. Each row owns its own `usePopover` instance; opening one row's menu closes any other open popover via the HTML spec's single-popover-auto invariant. **Delete item is hidden for non-admin viewers when the row's `createdById` does not match the viewer (or is `null` on a legacy row). Admins see Delete on every row.** See `[fc:delete-button-gating]`. | open, closed |
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
| `sidebar-tree-rename-input` | Inline rename input in `TreeNode.tsx`. Appears in place of the node label when "Rename" is chosen from the kebab. `maxLength={64}` enforces the name cap. Validates URL-safety on every keystroke; invalid char renders inline error below the input. Blur (without Enter) submits — empty blur cancels. | idle, focused, error (URL-safe violation), at-cap (browser caps at 64) |

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
| `sidebar-folder-create-input` | Inline text input for folder name. Placeholder: "Nome da pasta". On every keystroke `validateUrlSafeName` runs; an illegal character flips the input border to `--danger` and renders the inline error below it. `maxLength={64}` enforces the hard cap. | idle, focused, error (URL-safe violation OR duplicate name "Já existe uma pasta com esse nome aqui."), at-cap (browser caps keystrokes at 64) |
| `sidebar-folder-create-confirm` | Enter key confirms creation. Blocks submit when the URL-safe validator fails — the inline error remains until the user fixes the name. | success: folder appears in tree; empty name: no action, focus stays |
| `sidebar-folder-create-cancel` | Escape key cancels | input removed, no folder created |

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
| `command-palette-esc-badge` | Escape badge / button in palette footer that closes the palette on click. Styled identically to a keycap (`.escBadge` rule — `--bg-card`, `--border`, `--font-mono` 10 px). | default, hover (`--text` + `--border-strong`) |
| `command-palette-footer-hints` | Footer hint row showing ↑↓ navigate / ↵ open / esc close. Keyboard indicators rendered with `<Kbd>`: ↑↓ via `<Kbd.Key>` escape hatch, ↵ and esc via `<Kbd keys={[…]} />`. | always visible while palette is open |
| `command-palette-dismiss` | Escape key or scrim click | closes palette |

## new-project-dialog

New Project creation dialog (`NewProjectDialog.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `new-project-dialog-scrim` | Modal scrim backdrop | visible when open; click outside dismisses |
| `new-project-dialog-card` | Dialog card with scale-in animation | open, closed |
| `new-project-dialog-name-input` | Project name text field. Validates URL-safety on every keystroke via `validateUrlSafeName`: an illegal character renders the inline `dialog-error` below the input and disables the primary action. Hint text below the field reads "Use letters, digits, hyphens, or underscores." `maxLength={64}`; a `NameLengthCounter` appears in the hint row when the name is ≥ 56 chars. | idle, focused, error (empty OR URL-safe violation OR over-cap), near-cap (counter visible at 56–63 chars, --text-dim), at-cap (counter --danger at 64 chars) |
| `new-project-dialog-icon-picker` | Embedded icon picker (same component as project kebab "Change icon") | shows `icon-picker` inline in dialog |
| `new-project-dialog-labels` | Field labels render in ALL-CAPS (`PROJECT NAME`, `ICON`). Primary action button is `Create Project` in create mode and `Update Project` in edit mode. Name input placeholder is `My-Project` (hyphen instead of space — names are URL path segments now). | create mode, edit mode |
| `new-project-dialog-cancel` | Cancel button (`btn-secondary`) | default, hover, focus-visible |
| `new-project-dialog-create` | `Create Project` accent button in create mode, `Update Project` in edit mode | default, hover (`--accent-bright`), focus-visible, active, disabled (submitting) |

## edit-project-dialog

Project update dialog (`NewProjectDialog.tsx` in edit mode).

| ID | Surface / Interaction | States |
|---|---|---|
| `edit-project-dialog-card` | Dialog card matching New Project, prefilled with current project name and icon | open, closed |
| `edit-project-dialog-name-input` | Project name text field. Same URL-safe validation + `maxLength` + `NameLengthCounter` as `new-project-dialog-name-input`. | idle, focused, error (empty OR URL-safe violation OR over-cap), near-cap, at-cap |
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

## home

Workspace home at `/` (`AllProjectsPage` under `src/app/(app)/page.tsx`). The legacy `/projects` route redirects here client-side. Fetches `GET /api/home` and renders four stacked sections — Hero (greeting + counts), Recents (cross-project mockup grid), Projects (the existing project-card grid), Orphans (mockups with no project). The home is the only `(app)` surface using full-bleed width.

| ID | Surface / Interaction | States |
|---|---|---|
| `home-page` | Page container under the in-shell layout. Full-bleed (no centered max-width). Stacks Hero → Recents → Projects → Orphans. | loading (skeleton), error (`http_*` banner), populated. Empty workspace shows Hero + Projects empty state only. |
| `home-hero` | Greeting `{Good morning|afternoon|evening}, {firstName}` (display 28 px, `--text-bright`) + sub-line `{long date} · {N} mockups updated since yesterday` (mono 13 px). Sub-line hidden when count is 0. | morning/afternoon/evening; with-count / no-count |
| `home-recents-section` | "Continue working" header + count chip + grid of up to 6 recent mockups using `mockup-card` with the breadcrumb shown as the new `subtitle` prop. Cross-project (includes orphans). Hidden when zero recents. | hidden, populated |
| `home-projects-section` | "Projects" header + count + `+ New project` accent CTA + grid of `project-card`. Empty state lives inside this section when `projects.length === 0`. | populated, empty (centered SVG stack + CTA inline within the section) |
| `home-orphans-section` | "No project" header + count + grid of `mockup-card`. Hidden when zero orphans. | hidden, populated |
| `home-section-gap` | Vertical spacing between sections is `--space-2xl`. | n/a |
| `home-full-bleed-layout` | `/` is the only authenticated surface using full-bleed width. Other pages (`/projects/<slug>`, `/projects/<slug>/<...path>`, `/annotations/[id]`, `/settings/*`) remain centered. | n/a |

## project-card

Card tile for a single project on the `home-projects-section` grid (`ProjectCard.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `project-card` | Card with resolved project icon, name, mockup count, folder count. Default visual: `--accent-overlay-soft` background, 1 px `--accent` border, `--shadow-glow` shadow. Border-radius: `--radius-card`. Whole card is a `<Link>` to `/projects/<slug>`; kebab button absolutely positioned top-right. | default, hover (border → `--border-strong`, bg → `--bg-card-active`, translateY(-1px)), focus-visible, active (translateY(1px)) |
| `project-card-icon` | Resolved icon from `Project.icon` token (same resolver as `sidebar-tree-project-item`). Falls back to a default project glyph when icon is null/unknown | static, `--text-bright` color |
| `project-card-name` | Project name as `<h2>`. Truncated with `text-overflow: ellipsis` | full name in `title` tooltip |
| `project-card-meta` | Mockup count + folder count line in mono font (`{M} mockups · {F} folders`). Singular/plural handled. | `--text-dim`, tabular numerics |
| `project-card-kebab` | Three-dot kebab anchored top-right. Hidden by default, fades in on row hover/focus. Uses `usePopover('right')` for top-layer paint. Items: **Open** (navigates), **Edit** (opens `edit-project-dialog`), **Delete** (`confirm-dialog`, danger). | hidden (default), visible (hover/focus), open (popover paint) |
| `project-card-kebab-menu` | Native HTML popover (`popover="auto"`) with the three actions above. Light-dismiss + ESC handled by the browser. The Delete item fires `confirm-dialog` and on accept calls `DELETE /api/projects/[id]`, then refreshes the page list. **Delete is hidden for non-admin viewers when the project's `createdById` does not match the viewer (or is `null`). Admins see Delete on every card.** See `[fc:delete-button-gating]`. | open, closed |

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
| `mockup-card-subtitle` | Optional context line rendered between name and meta when the `subtitle` prop is set (used by `home-recents-section` to show the breadcrumb `Project · Folder · Subfolder` or `Ungrouped`). Mono 11 px, `--text-muted`, single-line with `text-overflow: ellipsis`. | present, absent |

## empty-state

Empty state component for projects and folders (`EmptyState.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `empty-state-project` | Empty project (no mockups, no folders). Icon (48 px, 50% opacity) + title (18 px bold, `--text-bright`) + description (13 px, `--text-dim`, max 320 px) + action buttons | visible when project has no content |
| `empty-state-folder` | Empty folder. Same visual pattern as project empty state | visible when folder has no content |
| `empty-state-cta-primary` | "Upload mockup" accent button (`btn-accent`) | default, hover (`--accent-bright`), focus-visible, active |
| `empty-state-cta-secondary` | "Create folder" / "Create subfolder" secondary button (`btn-secondary`) | default, hover (`--btn-bg-hover` + `--border-strong`), focus-visible, active |
| `empty-state-sidebar-inline` | Inline "Empty folder" text in sidebar when expanded folder has no children | shown below empty expanded folder |

## drop-overlay

Full-bleed overlay that surfaces while the user drags a file over the workspace window. Drops route to `new-mockup-dialog`; dragleave dismisses with a 120 ms fade. Sits at `z-index: 90` — above sidebar, topbar, content, and any mockup iframe.

| ID | Surface / Interaction | States |
|---|---|---|
| `drop-overlay` | Container that mounts on `dragenter` of a file over the window, dismounts on `dragleave` or after the drop hands off to `new-mockup-dialog`. Z-index 90 (above tweaker 80, dialog scrim ~50) | hidden (idle), visible (dragging file), entering (220 ms fade), exiting (120 ms fade) |
| `drop-overlay-glass-full` | Default — full-bleed scrim with `--scrim-glass-bg` + `blur(16px) saturate(140%)`. Centred panel `--surface-glass-bg` glass with dashed `--accent-overlay-mid` border (2 px), cloud-up icon, title `Drop your HTML here`, sub-line `Will be added to <breadcrumb-path>` (mono, `--text-dim`) | visible variant |
| `drop-overlay-dashed-border` | No scrim; only a dashed `--accent` 2 px border over the section/iframe target plus a floating glass chip top-right (`Drop here · <path>` in `--accent`) | visible variant |
| `drop-overlay-scrim-leve` | Same panel as `glass-full` but the scrim uses `blur(4px)` and 40 % opacity — less imposing | visible variant |
| `drop-overlay-hybrid` | Dashed `--accent-overlay-mid` border on the section target combined with a translucent, compact (~340 px wide) centre chip | visible variant |

## new-mockup-dialog

Dialog that surfaces after a successful drop OR after the file picker (sidebar footer or empty-state CTA) returns a file. Carries the parsed filename as Name, pre-selects destination by view inference, and offers a Replace-as-new-version toggle when the user dropped on a mockup view.

| ID | Surface / Interaction | States |
|---|---|---|
| `new-mockup-dialog` | Glass surface, 520 px wide (680 px on the preview variant), standard scrim. Esc cancels. `Add` disables and shows inline progress while uploading | closed, open, submitting, success-redirect, error |
| `new-mockup-dialog-name` | Name input (uncontrolled, pre-populated by `filename.replace(/\.html?$|\.zip$/, '')`). Validates against `URL_SAFE_NAME_PATTERN`. `maxLength={64}`; `NameLengthCounter` appears below when ≥ 56 chars. | default, focused (`--accent` border), invalid (`--danger` border + inline error), near-cap (counter at 56–63 chars), at-cap (counter --danger), submitting |
| `new-mockup-dialog-project-picker` | Project selector — native `<select>` in the default layout. Pre-selected by view inference: when the dialog opens on `/projects/<slug>` and the projects list resolves, the matching project becomes the initial value | default, focused, changed (re-fetches the folder tree for the new project and resets the folder picker), unresolved (URL slug has no match → `Unsorted`) |
| `new-mockup-dialog-folder-picker` | Folder selector with depth indentation (`Hero`, `Hero / Section`, `Hero / Section / Variants`). Pre-selected by view inference: folder names from `/projects/<slug>/<…path>` resolve to ids once the project tree lands. Shows `Loading folders…` (disabled) while the per-project tree is in flight | default, focused, depth-indented options, loading (folder tree request in flight) |
| `new-mockup-dialog-preview` | 320 × 180 sandboxed iframe (or static SVG gradient placeholder) showing a preview of the dropped HTML. Rendered only in the `nome+pickers+preview` layout variant | hidden, visible (iframe loaded), error (no preview) |
| `new-mockup-dialog-replace-toggle` | Radio pair `Add as new mockup` / `Replace as new version of "<name>"`. Visible only when the drop happened on a mockup view. Default selection: `Add`. The `hidden-until-edit` sub-variant collapses to a single link `Or replace this mockup with a new version` until clicked | hidden (not on mockup view), visible-add (default), visible-replace (selected), collapsed-link, expanded |
| `new-mockup-dialog-file-chip` | Small chip in the header showing the file the user is uploading: `<icon> <name> · <size> · <type>` (e.g. `pricing-v3.html · 12.4 KB · HTML`). Three icon variants — `color-coded` (orange HTML / blue ZIP, default), `mono` (`--text-dim` glyph for both), `no-icon` (text only) | color-coded, mono, no-icon |
| `new-mockup-dialog-inline-pickers` | Layout variant where Project + Folder use chip rows (`picker-chip`) instead of native `<select>`. Selected chip has `--accent-soft` bg + `--accent-overlay-mid` border + `--accent` text | default, hover, active (selected) |
| `new-mockup-dialog-progress` | Inline progress bar above the footer buttons while the upload is in flight. Indeterminate by default, determinate if `xhr.upload.progress` is available | hidden, indeterminate, determinate |
| `new-mockup-dialog-layout-nome-only` | Layout variant — only the Name input, no pickers. Submits to the inferred project/folder silently | visible variant |
| `new-mockup-dialog-layout-pickers` | Default layout — Name + Project + Folder (native selects) | visible variant |

## empty-state-uploads

Upload-focused empty state — replaces the content of any workspace view when there are zero mockups (or zero projects) to show. Three sub-variants determine whether the user lands on a giant drop zone, a discreet pill, or both. Context-aware copy adapts to All Projects / Project / Folder.

| ID | Surface / Interaction | States |
|---|---|---|
| `empty-state-uploads` | Container that swaps in for the content grid when the current view has nothing to render. Clicking anywhere on the drop zone opens the OS file picker; drop opens `new-mockup-dialog` | visible when current view has zero mockups (and, at `/`, zero projects + zero orphans) |
| `empty-state-drop-zone` | Default — large dashed `--accent-overlay-mid` border panel on `oklch(20% 0.05 165 / 0.18)` surface, cloud-up icon, title + sub. Copy adapts by context: All Projects = `Drop your first mockup here / or click to choose a file`; Project = `No mockups in <project> yet / Drop an HTML or click to upload to this project`; Folder = `<folder> is empty / Drop an HTML or click to upload to this folder` | default, hover (panel border brightens to `--accent`), focus-visible, drag-over (`--accent-overlay-mid` background pulse) |
| `empty-state-pill-cta` | Discreet — pill button `+ Upload mockup` (accent text on `--btn-bg`) + sub-line `or drop anywhere on the page` (variation `or drop anywhere · saves to <project|folder>` in scoped views) | default, hover, focus-visible, active |
| `empty-state-both` | Combines the giant drop zone with a `+ New project` chip in the topbar — two paths surfaced simultaneously. Only used at `/` when the user has zero projects | visible at `/` with no content |

## loading-state

Shared loading placeholder for page-level fetches (`LoadingState.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `loading-state` | Centered, dimmed status line (`--text-muted`, `--type-sm`) inside a `role="status"` + `aria-live="polite"` + `aria-busy="true"` container. Used by `/`, `/projects/<slug>`, `/projects/<slug>/<...path>`, `/annotations/<id>`, `/settings/agents` while their data fetches are in flight. Accepts an optional `message` prop; defaults to `"Loading…"` | visible while `data === null`, dismissed once the fetch resolves |

## error-state

Shared error placeholder for page-level fetches (`ErrorState.tsx`).

| ID | Surface / Interaction | States |
|---|---|---|
| `error-state` | Centered, danger-toned (`--danger`, `--type-sm`) message wrapped in `role="alert"`. Used by the same pages as `loading-state` when a fetch fails or returns a non-OK status | visible on fetch failure |
| `error-state-retry` | Optional "Try again" button (`--btn-bg`, `--type-sm`). Rendered only when the caller passes `onRetry` | default, hover (`--btn-bg-hover` + `--border-strong`), focus-visible (2 px accent outline), active |

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
| `mockup-viewer-rail-hover-expanded` | Transient 300px width on body mouseenter (NOT on drag handle, AND NOT while the rail is being dragged — letting the rail morph mid-drag would change its width and clamp-jump it 240 px leftwards away from the cursor). Same `max-height` cap as collapsed. | width transition via `--motion-base` |
| `mockup-viewer-rail-pinned` | Sticky 300px width via Lock-open toggle. Also driven externally by bumping `expandSignal` from `AppMainViewer` — a canvas pin click pins the rail open so the matching card is in view. | persists past mouseleave, button shows pressed state |
| `mockup-viewer-rail-drag` | Drag handle uses the project's shared grab glyph `GoGrabber` from `react-icons/go` (sized 25 × 25 — canonical drag-affordance size across the product; rotated 90° because the rail's grab slot is horizontal and `GoGrabber` ships vertical). Drag handle DOES NOT trigger hover-expand — only the rail body does. Has `touch-action: none` so pointer drag works on touchscreens. Pointerdown calls `setPointerCapture` on the grab handle so fast cursor movement past the 28 px handle can't let the browser escalate the gesture (text selection across the rail body, native HTML5 drag of the inner svg) and fire `pointercancel`; the drag state also recovers cleanly if `pointercancel` does fire (OS preemption etc.) — same release path as `pointerup`. Dragged position is cleared when fullscreen toggles so the rail returns to its spec-default coordinates instead of being stranded off-screen. | grab/grabbing cursor |
| `mockup-viewer-rail-lock-open` | Lock-open button rendered with `react-icons/vsc` `VscPinned` — "Keep expanded" / "Unlock" tooltip. Pressed state only changes `background` + `color` (no rotation) — the icon stays upright. | aria-pressed reflects state |
| `mockup-viewer-rail-add-button` | "+ New annotation" button at foot. Morphs round → pill with label + `<Kbd keys={['mod','shift','n']} />` keycap chip (OS-aware rendering). `aria-label` uses `formatShortcut` for plain-text SR announcement. Pinned via `flex-shrink: 0` to the spec-default 32 × 32 pill so the inner 30 × 30 icon sits dead-centre even though the collapsed foot inner is narrower than the button's declared width. | collapsed/expanded width transition |

### mockup-viewer-toolbar

Center-bottom floating dock. See spec §5.

| ID | Surface / Interaction | States |
|---|---|---|
| `mockup-viewer-toolbar` | Glass-bg dock with zoom + fullscreen + version chip + drag handle | default, dragging |
| `mockup-viewer-toolbar-zoom-out` | Zoom-out button (`⌘−`) | enabled, disabled at 25% min |
| `mockup-viewer-toolbar-zoom-label` | Clickable % label — resets to 100% | hover, reset |
| `mockup-viewer-toolbar-zoom-in` | Zoom-in button (`⌘+`) | enabled, disabled at 400% max |
| `mockup-viewer-toolbar-fullscreen` | Fullscreen toggle (F) | inactive, active (pressed) |
| `mockup-viewer-toolbar-drag` | Drag handle on right edge — `GoGrabber` from `react-icons/go` (25 × 25 — matches `mockup-viewer-rail-drag`; default vertical orientation matches the toolbar's tall slot). Drag clamps to `mockup-viewer-app-main` bounds (8 px margin), NOT viewport. Has `touch-action: none` so pointer drag works on touchscreens (without this, the browser's native page-pan claims the gesture). Pointerdown calls `setPointerCapture` on the grab handle and the drag effect listens for `pointercancel` alongside `pointerup` so a cancelled pointer (OS preemption, escalated native gesture) doesn't pin the toolbar in its dragging state. Dragged position is cleared when fullscreen toggles so the toolbar returns to its centered-bottom default after the containing block's bounds shift. | grab/grabbing cursor |

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
| `mockup-viewer-version-action-delete` | Per-row "Delete" item (label dropped the redundant noun) — opens a `confirm-dialog` quoting the version label (e.g. "Delete v3") + warning that anchors pointing at this version lose their source-of-truth pin. DELETE `/api/mockups/[id]/versions/[vid]` only after confirm. **Hidden for non-admin viewers when the version's `createdByType === 'agent'` or `createdBy !== viewer.userId`.** See `[fc:delete-button-gating]`. | danger styling |

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
| `annotation-card-primary-kebab` | 3-dot kebab button in the meta row, visible when the primary comment is the current user's OR the viewer is an admin. Opens `annotation-card-primary-menu` via `usePopover('right')`. Hosts the status toggle group + Edit + Delete affordances. Replaces the previous standalone pencil. Inside the menu: Edit is own-only (no admin override on edit); Delete is available to owner OR admin (`[fc:delete-button-gating]`). | hidden (not own and not admin), visible (own or admin); hover (surface-hover bg), open (accent bg) |
| `annotation-card-primary-menu` | Native HTML popover (`popover="auto"`) anchored to the kebab. Hosts the status toggle group, "Edit" item, and "Delete" (danger) item. Top-layer paint — escapes the rail's `overflow-y: auto`. Browser-managed light-dismiss + ESC; menu items also call `close()` before firing their action so the popover closes with the same gesture. | closed, open |
| `annotation-card-status-toggle` | Icon-only radio group of three status options at the top of the kebab menu: **Open** (`VscCircleLarge`, `--info`), **Needs review** (`VscCommentUnresolved`, `--warning`), **Resolved** (`VscPass`, `--success`). Each icon takes the colour of its matching `annotation-card-status-pill`. The verbose label is exposed via `data-tooltip` + `aria-label`; the body of the button is just the icon. Active option draws an inset 1 px ring in its own colour over the matching `*-soft` background. Clicking dispatches `PATCH /api/annotations/[id] { status }`. | per-option idle / hover / active |
| `annotation-card-delete` | Danger menu item labelled simply **Delete** (drops the redundant noun — the kebab is already scoped to the annotation). Deletes the annotation via `DELETE /api/annotations/[id]` after a `confirm-dialog` accept. Cascades through the thread → messages → reactions. Visible to owner OR admin; hidden for other viewers. See `[fc:delete-button-gating]`. | idle, hover (danger bg) |
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
| `comment-kebab` | Kebab menu visible on own comments OR for admins. Opens a native HTML popover (`popover="auto"`) via `usePopover('right')`. Reply opens the always-visible reply form below; Edit flips the comment into `comment-edit-inline` mode (no native prompt — **Edit is own-only; admins do not get Edit on others' comments**); Delete confirms then DELETEs `/api/messages/[id]` (**Delete is available to owner OR admin** per `[fc:delete-button-gating]`). The primary message (annotation body) cannot be deleted — the API returns 400 and surfaces "Delete the annotation instead". Top-layer paint + browser-managed light-dismiss + ESC. | opens Reply / Edit / Delete |
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

## settings-invites

Admin-only invite management page at `/settings/invites`. Accessible via avatar menu → **Admin** group → "Invites". Mirrors `settings-agents` visual language (DS 21-invites).

| ID | Surface / Interaction | States |
|---|---|---|
| `settings-invites-page` | 600 px max-width container with h1 `Invites`, subtitle `Generate invite links for new teammates.`, header row (count + accent `+ New Invite` button + `⋮` `settings-invites-bulk-trigger` kebab), and a stack of invite cards or the empty-state for the current sub-state. Topbar breadcrumb is empty — the page h1 carries the label. | first-visit (`settings-invites-empty-onboarding` card), post-activity terse (`settings-invites-empty-terse`), populated (`settings-invites-card` rows) |
| `settings-invites-card` | Each invite renders as a card pixel-aligned with DS 21: 36×36 envelope-icon box (inline SVG, accent-soft bg + `--accent` tinted for unused; muted check for used; `--danger-soft` warning for expired/revoked/disabled), title (14 px / 600) — `Invite for <email>` when bound, `Open invite` otherwise — and meta line `Created X · <Role> · <state>` in `--text-muted` with the state chunk colored by lifecycle (`--text-dim` for normal, `--danger` for expired/revoked/disabled). No token preview is shown — the full link is reachable only through the `settings-invites-copy-btn` clipboard write. Two icon buttons appear for unused (copy + revoke); terminal cards collapse the actions column to a single Delete icon (visible on hover). The actions cluster is vertically centered (`align-self: center`) on the row's midline so it sits balanced regardless of meta wrapping. Terminal cards get `opacity: 0.65`. | unused, used, expired, revoked, disabled |
| `settings-invites-create-btn` | Header `+ New Invite` accent button. Opens `new-invite-dialog`. | default, hover, focus-visible, active |
| `settings-invites-copy-btn` | Copy-link icon button per unused card. On click writes `${APP_URL}/invite/<token>` to the clipboard, briefly swaps the icon to a check, fires a DS 17 toast `Invite link copied` (3 s, no action). | default, hover (`--surface-hover` bg + `--text` color), copied (success check icon, 1.2 s), focus-visible |
| `settings-invites-revoke-btn` | Revoke icon button per unused card, rendered with a `VscCircleSlash` glyph (NOT trash — trash is reserved for the terminal-state Delete that actually removes the row). Clicking opens a styled `confirm-dialog` (`useConfirm`) quoting the invite name and warning `Anyone with this link won't be able to sign up. This action can't be undone.`; only on accept does the row transition in place to the revoked terminal state via `DELETE /api/invites/[id]`. Never uses native `window.confirm`. **Admin-only surface — members never reach this page.** | default, hover (`--danger-soft` bg + `--danger` color), focus-visible; shows confirmation dialog before revoke |
| `settings-invites-delete-btn` | Trash icon button per terminal-state card (revealed on hover). Removes the historical row from the list — no reactivation path. Fires `DELETE /api/invites/[id]` (the same endpoint as revoke; the server treats delete of terminal-state rows as history removal). **Admin-only surface — members never reach this page.** | hidden by default, visible on row hover, danger hover styling |
| `settings-invites-empty-onboarding` | Dashed-border onboarding card spanning the full 600 px frame width (left edge aligns with the `Invites` h1, right edge with the header CTA). Eyebrow `Getting started` in mono accent, title `Onboard your first teammate`, 3 numbered steps (Click New Invite → Pick role/expiry/email → Copy + send), primary `Create your first invite` button, close-X in the top-right. Shown only on first visit, before the admin has either created an invite or dismissed the card. | shown (first visit), hidden (post-activity) |
| `settings-invites-empty-onboarding-dismiss` | Close-X icon button (top-right of the onboarding card). Dismisses the card permanently (per-user pref). | default, hover (`--surface-hover` bg) |
| `settings-invites-empty-terse` | Centered icon (48×48 envelope, accent-soft bg) + title `No invites yet` + line `Generate a link to invite a teammate.`. No CTA inside the empty state itself — the header `+ New Invite` button is the sole entry point. Appears when the list is empty after the admin created the first invite (and later revoked/used it) OR after dismissing the onboarding card. | shown when post-activity + zero invites, hidden otherwise |
| `settings-invites-onboarding-pref` | The "has the admin seen the onboarding card" bit is per-user (Phase 3 picks whether it lives in `localStorage` or in a server-side user pref). One-way transition: once true, never flips back. | false (show onboarding), true (show terse / populated) |
| `settings-invites-role-gate` | Non-admin users hitting `/settings/invites` directly (via URL) are redirected to `/` with a global 403 page or a `You don't have permission to view this page.` toast. The avatar-menu does not link to the page for members. | admin (renders page), member (403 redirect) |
| `settings-invites-bulk-trigger` | 32 × 32 `⋮` ghost button in the header (right of `+ New Invite`, 6 px gap). Anchors `settings-invites-bulk-menu` via `usePopover('right')`. | default, hover (`--surface-hover` bg + `--text` color), focus-visible, open (menu visible) |
| `settings-invites-bulk-menu` | Native HTML popover (`popover="auto"`) anchored to `settings-invites-bulk-trigger`. 240 px width, two danger-coloured rows separated by a divider: **Revoke all open invites** (with a live mono count chip of unused invites) and **Clear all history** (with a live mono count chip of terminal-state invites). Each row is disabled (0.4 opacity, `cursor: not-allowed`) when its count is zero — the row is never hidden, so the menu shape stays consistent regardless of list state. Paints in the browser top-layer; light-dismiss + ESC handled natively. | closed, open; each item: default, hover (`--danger-soft` bg), disabled (count = 0) |
| `settings-invites-bulk-revoke-all` | First menu row, glyph `VscCircleSlash` (matches the per-card revoke icon — same affordance, scaled up to bulk). On click opens a `confirm-dialog` (`useConfirm`) — body `Revoke all {N} open invites? Anyone with one of those links won't be able to sign up. This action can't be undone.` Confirm button: `Revoke all`, danger-styled. On confirm fires `POST /api/invites/revoke-all`; the server marks every unused invite (open or email-bound) as revoked in one transaction. The card list animates each affected row from unused → revoked in place; counter is unchanged (revoked rows still count). | default, hover, disabled (no unused invites), confirm dialog visible |
| `settings-invites-bulk-clear-history` | Second menu row. On click opens a `confirm-dialog` — body `Clear {N} completed invites from the list? This removes the historical record. People who already signed up keep their accounts.` Confirm button: `Clear history`, danger-styled. On confirm fires `DELETE /api/invites/history`; the server deletes every terminal-state row (used / expired / revoked / disabled). The affected rows animate out; counter decrements. Does **not** affect existing user accounts created from used invites. **Admin-only surface — members never reach this page.** | default, hover, disabled (no terminal-state invites), confirm dialog visible |

## new-invite-dialog

Dialog composed from `dialog` (DS 22-new-invite-dialog) opened by `settings-invites-create-btn`. Three fields, all on the same modal.

| ID | Surface / Interaction | States |
|---|---|---|
| `new-invite-dialog-card` | `dialog-card` shell with title `Create invite`, gap 14 px between fields, scale-in spring on open. Max-width 440 px, padding 18/18/14. Close-X at top-right. | closed, open |
| `new-invite-dialog-email` | Optional text input bound to the `email` field with placeholder `name@example.com` and a clear-X icon that appears when non-empty. Helper text `If set, signup requires this exact email.` Validation: format-checked only on submit (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`); empty is valid. | idle, focused (3 px `--accent-soft` ring), invalid (red border + helper turns `--danger`: `Please enter a valid email or leave empty.`) |
| `new-invite-dialog-role` | Two-segment control (`Member` / `Admin`). Default active: `Member`. Active segment: `--accent-soft` bg, `--accent` text, inset 1 px `--accent-overlay-mid`. Member glyph: person silhouette. Admin glyph: shield-with-check. Helper text swaps with the active segment — Member: `Can view projects and comment. No settings access.` Admin: `Full access, including creating new invites and tokens.` | Member active (default), Admin active |
| `new-invite-dialog-expiry` | Four-segment control (`24h` / `7d` / `30d` / `Never`). Default active: `7d`. Helper text shows the concrete resolved date — e.g. `Link dies on May 27, 5:42 PM.` for `7d`, `Link lives until you revoke it.` for `Never`. | 24h, 7d (default), 30d, Never |
| `new-invite-dialog-cancel` | Secondary `Cancel` button (`dialog-button` secondary variant). Closes the dialog. | default, hover (`--surface-hover` + `--text-bright`), focus-visible |
| `new-invite-dialog-submit` | Accent `Create invite` button (`dialog-button` accent variant). Always enabled. On submit: validates email, calls `POST /api/invites`, closes the dialog, prepends a new card to the list with a 220 ms accent-ring fade-in (`--ease-spring`), automatically copies the freshly minted link to the clipboard, fires a DS 17 toast `Invite link copied to clipboard`. | default, hover, focus-visible (3 px `--accent-soft` ring) |

## invite-signup

Public signup landing at `/invite/<token>` (DS 23-invite-signup). No auth required. Open and email-bound invites are visually identical at rest — the only signal of a bound invite is the helper text + the explicit mismatch error.

| ID | Surface / Interaction | States |
|---|---|---|
| `invite-signup-page` | Centered 400 px card on `--bg`, 32 px padding, `--bg-card` background, `--border-subtle`, `--radius-card`, 16 px vertical gap. Markup wordmark (32 px / 800 / `--text-bright` with accent dot) above the card. Foot line below the card: `Trouble signing up? Ask the admin who sent you this link.` Card body swaps between the form and the warning-card template per state. | clean (form), bound-clean (form + email-helper), bound-mismatch (form + email-helper + inline error), rate-limit-toast (form + danger toast), terminal (warning-card replaces form for expired/used/revoked/disabled) |
| `invite-signup-h1` | `Create your account` (20 / 700 / `--text-bright`). | static |
| `invite-signup-preamble` | `You were invited to Markup.` Identical for open and email-bound invites — the bound email is never echoed on the public page. | static |
| `invite-signup-email` | Email input. Editable, placeholder `you@company.com`. Identical visual treatment for open and bound — no pre-fill, no lock glyph, no border accent. The presence of a helper line below is the only signal that an invite is bound. | idle, focused, invalid (red border) |
| `invite-signup-email-hint` | Hidden for open invites. Bound invites render `Use the email your admin used to invite you.` (11 px `--text-muted`). | shown (bound), hidden (open) |
| `invite-signup-password` | Password input with a show/hide eye icon on the right. Helper: `At least 12 characters.` | idle, focused, invalid (validation error in shared error region) |
| `invite-signup-name` | Friendly display name input. Same field as the setup form. | idle, focused, invalid |
| `invite-signup-submit` | Primary full-width 40 px button labelled `Create account`. Disabled until all three fields have content. Validations fire on submit only. | idle, hover (`--accent-bright`), disabled (0.4 opacity), submitting |
| `invite-signup-error` | Shared inline error region above the submit button. 12 px text, `--danger` color, `--danger-soft` background, `--radius-xs`. One message at a time: `Email doesn't match this invite. Use the email your admin invited.` / `Please enter a valid email.` / `Password must be at least 12 characters.` / `Something went wrong. Please try again.` | hidden, visible (one of four copies) |
| `invite-signup-rate-limit` | On 429 response from `POST /api/invites/[token]/redeem`, a DS 17 danger toast fires: `Too many attempts. Try again later.` Form is not disabled; next submit re-shows the toast. Per-IP limit: 5 failed attempts / 15 min. | quiescent, throttled (toast fires on every submit) |
| `invite-signup-terminal` | Warning-card shell that replaces the form for the four terminal states (expired, used, revoked, disabled-auto-revoked). 28×28 `--danger-soft` warning-triangle icon, 16 px / 700 title, 13 px `--text-dim` body. All four use the same template; copy varies per state. A fifth "unknown / malformed token" state shares the template with the generic copy `This invite isn't available.` (anti-enumeration — non-existent tokens look identical to legitimate terminal ones). | expired, used, revoked, disabled, unknown |
| `invite-signup-already-signed-in` | If a logged-in user opens `/invite/<token>`, the route immediately redirects to `/` with a DS 17 toast `You're already signed in.` No card rendered. | redirect-on-mount |
| `invite-signup-token-auto-revoke` | Per-token limit: > 20 failed attempts (across any rolling window) auto-revokes the token. Failed = 400 validation / 401 mismatch. Successful redemption resets the counter. On next page load the route resolves to the `disabled` terminal state. | counter ticking, threshold breached (token auto-revoked + state flip) |

## input-field

Reusable text-input primitive (`src/components/InputField/`) consumed by every form surface that grew during the upload work — `new-mockup-dialog`, `new-project-dialog`, and inline rename inputs. Wraps a native `<input>` with leading/trailing icon slots, a label, a hint row that flips to a danger row on error, and a Radix-driven `[data-invalid]` attribute that consumer code can drive via a `[data-state]` contract. Matches DS 28-input-field.

| ID | Surface / Interaction | States |
|---|---|---|
| `input-field` | Field shell: 34 px tall, `--bg-card` background, `--border-subtle`, `--radius-xs`. Focus flips border to `--accent-bright` + 3 px `--accent-soft` ring. Disabled state at 0.4 opacity. | resting, focused, disabled |
| `input-field-error-state` | Error visual (DS 28). Border flips to `--danger`, the hint row swaps to the danger copy, and the input triggers `anim-input-error-shake` once on transition into error. Two ways to enter the state: Radix `[data-invalid]` (form-validation primitive) and a consumer-driven `[data-state="error"]` attribute the parent sets imperatively (used by `new-mockup-dialog`'s URL-safe validator). | resting, `[data-invalid]` (Radix), `[data-state="error"]` (consumer) |
| `input-field-success-state` | Success visual (DS 28). Border flips to `--success-overlay-mid`, the trailing-icon slot shows a check glyph (`VscCheck`, `--success`) that triggers `anim-input-success-pop` on transition. Driven exclusively by `[data-state="success"]` from the consumer; never auto-derived. | resting, `[data-state="success"]` |

## alert-banner

Inline status banner (`src/components/AlertBanner/`). One component, four `status` variants. Used inline above forms (`new-mockup-dialog` global error / success) and inside page content (warnings, info hints). Matches the DS spec.

| ID | Surface / Interaction | States |
|---|---|---|
| `alert-banner` | Banner shell: 100% width within its container, 10 px / 12 px padding, `--radius-xs`, leading icon + body + optional dismiss `×`. Enters with `anim-banner-enter` (opacity 0 → 1 + translateY -4 px → 0). Dismiss button always rendered as the trailing slot; `success` and `info` variants also schedule an auto-dismiss timer. | mounted, dismissed |
| `alert-banner-error` | `status="error"`. Background `--danger-soft`, border `--danger-overlay-mid`, icon `VscError` in `--danger`. No auto-dismiss — error stays until the user dismisses or the consumer unmounts it. | mounted, dismissed |
| `alert-banner-warning` | `status="warning"`. Background `--warning-soft`, border `--warning-overlay-mid`, icon `VscWarning` in `--warning`. No auto-dismiss. | mounted, dismissed |
| `alert-banner-success` | `status="success"`. Background `--success-soft`, border `--success-overlay-mid`, icon `VscPass` in `--success`. Auto-dismisses after 4 s unless the user hovers (timer pauses on hover, resumes on mouseleave). | mounted, auto-dismiss, dismissed |
| `alert-banner-info` | `status="info"`. Background `--info-soft`, border `--info-overlay-mid`, icon `VscInfo` in `--info`. Auto-dismisses after 6 s (same pause-on-hover behaviour as success). | mounted, auto-dismiss, dismissed |

## folder-picker-tree-popover

Folder selector (`src/components/FolderPicker/`) used by `new-mockup-dialog-folder-picker` when the dialog ships the tree-popover layout variant. Composes a Radix `Popover` with a recursive tree of the current project's folder hierarchy.

| ID | Surface / Interaction | States |
|---|---|---|
| `folder-picker-tree-popover` | Trigger button shows the selected folder breadcrumb (`Hero / Section`). Click opens a Radix `Popover` with a recursive folder tree underneath the project root. Each node is a row with an expand chevron + `VscFolder` icon + name; selecting a leaf or branch resolves the picker and closes the popover. Empty projects show a single `Root` row. | closed, open, selected (chip displays breadcrumb) |

## preview-box

Mockup preview surface (`src/components/NewMockupDialog/PreviewBox.tsx`) used inside `new-mockup-dialog`. Renders a sandboxed iframe of the dropped HTML once it's been generated, with a skeleton shimmer while the preview is generating and an icon fallback if generation fails.

| ID | Surface / Interaction | States |
|---|---|---|
| `preview-box` | 320 × 180 surface in the dialog's preview slot. `--bg-elevated` background, `--border-subtle`, `--radius-xs`. Owns the data-state contract `loading` → `ready` → `fallback`. | loading, ready, fallback |
| `preview-box-skeleton` | Shimmer skeleton rendered while `[data-state="loading"]`. Two stacked rectangles + a top bar, all tinted `--surface-hover`, animated by `anim-skeleton-shimmer`. Dismissed on transition to `ready` or `fallback`. | loading (shimmer), ready (img), fallback (icon) |

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
| `dialog-close-button` | Optional 24×24 X button absolutely positioned at `top: 14px; right: 14px` inside `RadixDialog.Content`. Opt-in via `showCloseButton` on `RadixDialog.Content` (default `false`). Clicking fires `onOpenChange(false)` — identical to Escape and scrim-click. Color `--text-muted`; `:hover` → `--surface-hover` bg + `--text-bright`. Tab-order: appended after dialog body so first focusable in body still autofocuses on open. See docs/design/design-system/14-dialog.html. | hidden (default), visible (`showCloseButton`), hover (`--surface-hover` bg + `--text-bright`), focus-visible, disabled (`closeButtonDisabled`) |
| `dialog-close-button-disabled` | Disabled state of `dialog-close-button` during in-flight submit (`closeButtonDisabled={true}`). Opacity 0.4, `cursor: not-allowed`. Escape and scrim-click remain armed at the Radix layer. | state of `dialog-close-button` |
| `confirm-dialog-no-close-button` | `useConfirm` (Radix `AlertDialog`) never renders an X — the alert-dialog contract demands explicit Cancel/Confirm. Passing `showCloseButton` to the confirm path has no effect. | invariant |
| `new-mockup-dialog-close` | X close button in the top-right of the New Mockup dialog. Sourced from `RadixDialog.Content`'s `showCloseButton` (migrated from the previously hand-rolled `.closeBtn` in `NewMockupDialog.module.css`). | visible (idle), hover, focus-visible, disabled (uploading) |

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

## kbd

Keyboard-shortcut keycap chip indicator (`Kbd.tsx`). OS-aware: macOS uses ⌘⇧⌥⌃ symbols with naked adjacency; Windows/Linux uses Ctrl/Shift/Alt text labels with `+` separators. Primary API: `<Kbd keys={['mod', 'k']} />`. Escape hatch for multi-glyph chips: `<Kbd.Group><Kbd.Key>↑↓</Kbd.Key></Kbd.Group>`. No Radix primitive. DS source: `docs/design/design-system/29-kbd.html`.

| ID | Surface / Interaction | States |
|---|---|---|
| `kbd-group` | `<span role="group">` wrapper for one keyboard combo. Provides the SR-facing `aria-label` (e.g. "shortcut: Command Shift K"). Inline-flex row, 3 px gap. | default, disabled (`data-state="disabled"` → opacity 0.5) |
| `kbd-key` | Individual keycap chip (`<kbd>`). 20 px min-width, 2 px 6 px padding. `--bg-elevated` background, 1 px `--border` top/left/right, 1 px `--border-strong` bottom (depth effect). `--font-mono` 10.5 px / 600 weight. `--text-dim`. Glyph is OS-resolved: `mod` → ⌘ on mac / Ctrl on Windows-Linux; `shift` → ⇧ / Shift; `alt` → ⌥ / Alt; etc. | default only (no hover — chip is not interactive) |
| `kbd-plus` | `+` separator between keycaps. Rendered only on non-mac. `--font-mono` 10 px, `--text-muted`, 1 px side margin. | non-mac only |

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
| `global-routing-path-based` | All in-shell URLs are human-readable path segments resolved by the `GET /api/projects/by-slug/[slug]/resolve?path=…` aggregator. `/` = `home` dashboard (Hero + Recents + Projects + Orphans, full-bleed). The legacy `/projects` route is a thin client-side redirect to `/` so external bookmarks still work. `/projects/<slug>` = project view (calls `/view`). `/projects/<slug>/<...folders>/<mockup-slug>` = mockup viewer (`[...path]` resolved by `resolveProjectPath` to either a folder or a mockup; mockups render `MockupViewerPage` after fetching `/api/mockups/[id]/viewer`, folders render the folder view). `/projects/unsorted/<mockup-slug>` covers orphan mockups. `/annotations/[id]` and `/settings/agents` retain stable single-segment routes. The legacy `/mockups/[id]` viewer route redirects to `/`; `/api/mockups/[id]/*` API endpoints continue to use the mockup id. | path resolution server-side via the API aggregator; canonical paths produced client-side by `routes.ts` helpers (`projectsHref` returns `/`, `projectHref`, `folderHref`, `mockupSlugHref`) |
| `global-sidebar-collapse-persisted` | Sidebar collapse state survives reload. The shell reads `markup-sidebar-collapsed` from the `GET /api/shell` payload (which inspects the cookie) and passes `defaultCollapsed` to `Sidebar`. The client persists subsequent changes to the cookie + `localStorage` in the same write. Because the page is client-rendered, a short loading state precedes the first paint of the sidebar; the collapsed/expanded resolution is correct on first render after that. | cookie-driven default + client persistence — no flicker between renders |
| `global-favicon` | App favicon at `src/app/icon.svg` — Next.js 16 auto-serves it at `/icon.svg` and `<link rel="icon">` is injected at build time. The SVG is a 256 × 256 dark rounded square with a white serif **M** and an accent-green square as the period (matches `sidebar-logo`'s "Markup." typography). | rendered in all browsers; no separate raster ico shipped |
| `global-name-validation` | Single source of truth for URL-safe names: `src/lib/validation/url-safe-name.ts`. Pattern `/^[A-Za-z0-9_-]+$/` exported as `URL_SAFE_NAME_PATTERN`; `validateUrlSafeName(value)` returns `{ code, offendingChar?, message }` or `null`. `NAME_MAX_LENGTH = 64` caps all entity names; `NAME_LENGTH_WARN_THRESHOLD = 56` triggers the character counter. Three error codes: `name_required` (empty), `name_too_long` (> 64 chars; `POST /api/mockups` also returns `limit: 64`), `name_not_url_safe` (bad char). All name-writing API routes (`POST /api/projects`, `PATCH /api/projects/[id]`, `POST /api/projects/[id]/folders`, `PATCH /api/folders/[id]`, `POST /api/mockups`, `PATCH /api/mockups/[id]`) return the precise code as the `error` field on 400. Name inputs carry `maxLength={64}` and show a `NameLengthCounter` helper at 56–64 chars. | client: inline danger message; counter shows N/64 at ≥ 56 chars; server: `400 name_required` / `name_too_long` / `name_not_url_safe` |
| `delete-button-gating` | Cross-surface rule: every Delete action — sidebar kebab, project-card kebab, mockup-viewer version row, annotation-card kebab, comment kebab — is **hidden** when the viewer is not an admin AND not the recorded creator of the target entity. Hidden, not disabled — a disabled+tooltip variant was considered but rejected as cluttering the menus (the dropdown only ever shows actions the viewer can take). The server enforces the same rule via `requireOwnerOrAdmin`; the UI gate is a UX nicety. Agent-token settings and invites settings have a separate gate at the route level (members never reach those pages). See `docs/api/authz.md` for the full predicate and error codes. | hidden, visible |

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
| `anim-invite-card-ring` | New invite card ring fade-in on mint (1 px `--accent-overlay-mid` + 24 px `--accent-overlay-soft` glow → transparent) | `--motion-base` (220 ms) | `--ease-spring` | zeroed |
| `anim-skeleton-shimmer` | Shimmer skeleton — translates a diagonal `--surface-hover` highlight across the placeholder. Used in `preview-box[data-state=loading]`. | 1.4 s infinite | `ease-in-out` | zeroed |
| `anim-input-error-shake` | Error shake — `translateX(-4px → 4px → -2px → 2px → 0)`. Used in `input-field[data-state="error"] input` on the resting → error transition. | 320 ms | `--ease-spring` | zeroed |
| `anim-input-success-pop` | Success pop — `scale(0.6 → 1.1 → 1) + opacity(0 → 1)`. Used in `input-field[data-state="success"] .trailingIcon`. | 320 ms | `--ease-spring` | zeroed |
| `anim-banner-enter` | Banner enter — `opacity(0 → 1) + translateY(-4px → 0)`. Used in `alert-banner` on mount. | `--motion-base` (220 ms) | `--ease-standard` | zeroed |
| `anim-drop-overlay-fade-in` | Drop-overlay fade-in — `opacity(0 → 1)` as the overlay mounts on `dragenter`. Paired with a 120 ms fade-out on `dragleave` / drop. Used in `drop-overlay`. | 320 ms | `--ease-standard` | zeroed |

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
| `agent-mockup-patch` | Mockup-metadata mutation. `status` (`open`/`resolved`/`archived`), placement (`projectId`/`folderId`/`position`) writable by both kinds (user + agent); `name` admin-only (agents get 403 `forbidden_field`). Optional close-out step after the last thread on a mockup is resolved. | `mockup-status-pill`, `mockup-actions-menu` (existing UI surfaces) | `PATCH /api/mockups/[id]` |
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
