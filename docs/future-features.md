# Future features — backlog

Larger improvements identified during the v1.1 + v1.2 (grapesjs re-skin) cycles, captured here so they don't get lost between releases. Items are grouped by surface; each carries a one-line rationale and a rough size estimate.

Smaller bugs get fixed inline; this doc is for work that needs its own spec / plan.

---

## P1 — visible product gaps

### 1. System events distinct from user replies (annotation thread)
**Where:** `ThreadTimeline.tsx` + `/api/threads/[id]/resolve` + `/api/threads/[id]/reopen`.

**Today:** when a user resolves a thread, the API inserts a `Message` whose `body` is the literal string `"user <cuid> marked thread resolved"`. Renders in the timeline under the user's avatar as if it were a reply. The cuid leaks into the visible UI.

**Fix:** introduce a `kind: 'system'` field on `Message` (Prisma migration). Server resolves the cuid to a display name when constructing the body, AND the client renders system events with a distinct treatment (no avatar, smaller type, in `--text-muted`, prefixed with a small icon). Possibly a hairline horizontal divider with the event inline ("— Admin marked resolved · 3:05 AM").

**Size:** ~1 day.

### 2. Pin grouping when many pins cluster
**Where:** `AnnotationPin.tsx` + `MockupViewer.tsx` overlay.

**Today:** if a reviewer drops 6 annotations on the same hero CTA, all 6 pins overlap into an unreadable smear.

**Fix:** when ≥ 3 pins fall within a 60px radius at the current scroll/zoom, collapse them into a single "+N" badge that expands to a small radial menu on hover. Use the same `--ease-spring` micro-interaction as individual pins.

**Size:** ~1 day.

### 3. Drag-and-drop upload UI
**Where:** new `/mockups` empty-state CTA + on-list "+ New mockup" action.

**Today:** uploading a mockup is API-only (`POST /api/mockups` with multipart). No browser path.

**Fix:** a drop zone in the `/mockups` empty state and an "Upload" button in the page header that opens a small modal: drop a zip, give it a name, hits the same API endpoint. Auth uses the existing session cookie.

**Size:** ~half a day.

### 4. Public read-only share links
**Where:** new `/share/<token>` route + a "Share" button in the viewer topbar.

**Today:** every page is admin-only. To get external feedback you'd send the team a screenshot, defeating the point of the product.

**Fix:** generate a signed URL that grants read-only access to a single mockup (and optionally a single annotation) for a configurable TTL. The signed URL bypasses session auth but is scoped: only that mockup, only the annotation thread (no other mockups, no agent settings, no version mutations).

**Size:** ~2 days. Needs a new `ShareLink` table, a route handler that validates+resolves the signature, and a header treatment that signals "shared / read-only" to the visiting user.

### 5. Pixel-diff / AI visual diff between versions
**Where:** `/mockups/[id]/diff` page extension.

**Today:** the diff page is an eyeball overlay (two iframes, 50% opacity, scroll-sync). No automated diff.

**Fix:** server-side render both versions to PNG (puppeteer or a similar headless tool), run a perceptual diff (e.g. `pixelmatch`), highlight changed regions on the from→to overlay. For larger asks, add an LLM-driven semantic diff ("the hero copy changed from X to Y; the CTA color shifted").

**Size:** ~3 days for pixel-diff alone. Semantic diff is open-ended.

### 6. Search across mockups + annotations
**Where:** new global "/" command palette or dedicated `/search` page.

**Today:** finding a mockup means scanning the list. Finding an annotation means opening every mockup.

**Fix:** SQLite FTS5 virtual table over `Mockup.name`, `Annotation.message`, `Message.body`. Command-palette UI similar to Linear's: cmd-k opens, fuzzy search across all three sources, results grouped by entity kind, jumps directly to the annotation thread.

**Size:** ~2 days.

### 7. Multi-agent role taxonomy
**Where:** `AgentToken` schema + every `requireAdmin`/`identify` call site.

**Today:** every agent token has the same blanket admin-equivalent permissions on the API. Risky if the project grows beyond a single team.

**Fix:** add a `role: 'reviewer' | 'designer' | 'qa' | 'admin'` field on `AgentToken`, and per-route decisions about which roles can do what (e.g. only admin can delete versions; reviewer can comment but not delete; designer can upload new versions but not promote).

**Size:** ~2 days. Schema migration + audit of every API route + UI to assign role on token creation.

---

## P2 — quality-of-life

### 8. Realtime collaboration / multi-cursor
**Where:** the viewer + annotation modal.

**Today:** two reviewers on the same mockup don't see each other's pins until they refresh.

**Fix:** WebSocket channel per mockup. Broadcast: pin-creating, pin-clicking, modal-open, scroll position. Render other reviewers' cursors with a soft accent dot + their name. Linear/Figma calibration. This is a substantial undertaking — expect ~1 week including the WebSocket infra (or a polling fallback).

### 9. Time-travel pin replay
**Where:** versions tab + new "Replay" button.

**Today:** annotations are tied to the mockup, not a specific version. If you make 5 annotations on v1, then upload v2, the pins still render on v2 — sometimes in nonsensical positions.

**Fix:** record the version-id at annotation-create time. On the viewer, show pins only when the viewer's current version matches OR offer a "view v1 with v1's pins overlaid on v2" toggle (useful when you want to see "did v2 fix the things flagged on v1?").

**Size:** ~1.5 days. Schema migration + viewer logic.

### 10. Activity feed
**Where:** new top-level `/activity` route.

**Today:** no global view of "what changed across all mockups since I last logged in?"

**Fix:** chronological feed grouped by day: "Lumen Coffee · v3 promoted · 3 new annotations · reviewer-bot replied to 2 threads." Click any item to jump in. Use the same inverted timeline density as the thread.

**Size:** ~1 day.

### 11. Email / webhook notifications
**Where:** new `Notification` settings + integration points.

**Today:** if you're not actively viewing the app, you'll miss replies and resolves.

**Fix:** subscribe to events (annotation-replied, thread-resolved, version-uploaded). Two delivery channels: email (SMTP from env) and webhook (POST a JSON payload to a configured URL). Settings page for the user to toggle which events trigger which channels.

**Size:** ~2 days.

### 12. Mockup categories / tags
**Where:** Mockup schema + list filter.

**Today:** flat list. With > ~20 mockups it gets unwieldy.

**Fix:** optional tags on a mockup ("landing", "marketing", "internal"). Filter chip strip above the card grid; multi-select.

**Size:** ~half a day.

### 13. Comment threads on the diff itself
**Where:** `DiffViewer.tsx`.

**Today:** annotations live on a mockup, not on a specific diff comparison.

**Fix:** allow a reviewer to comment "v2 fixed this but introduced that" with a threaded discussion attached to a `(from, to)` version pair, not to the mockup as a whole.

**Size:** ~1 day. Mostly schema + UI.

### 23. Project-card grid on the root workspace
**Where:** new `ProjectCard.tsx` + change to `src/app/(app)/page.tsx` rendering when listing the root workspace.

**Today:** `MockupCard.tsx` is the only card component shipped. The root `/` workspace renders the orphan mockup set (`NO PROJECT` section after qa-findings) as a flat grid. Projects themselves never render as cards — they only appear as nodes in the sidebar tree. DS 05-project-card V3 prescribes a `Project Alpha` / `Project Beta` / `Project Gamma` card row but the live app has no surface that uses it.

**Fix:** introduce a `ProjectCard.tsx` matching DS 05-project-card (icon thumbnail + name + inline meta `{mockupCount} mockups · Updated {relTime}` + kebab). The root workspace renders a row of project cards above the orphan mockup grid; entering a project (via `/?project=...`) similarly renders sub-folder cards above the mockup grid (matching DS 12-project-folder-view). Thumbnail fallback: reuse the most-recently-updated mockup's thumbnail, or the project icon on a tinted background derived from the project's hue.

**Size:** ~1 day. New component + module CSS + tests + integration in the root + project routes + thumbnail-fallback helper.

---

## P3 — infrastructure / external concerns

### 15. Built-in TLS / Let's Encrypt
**Where:** Dockerfile / entrypoint / env.

**Today:** README documents using a reverse proxy (Caddy / Traefik) for TLS. That's the right call for production but means adopters can't `docker run` and get a working HTTPS endpoint.

**Fix:** optional sidecar Caddy with auto-HTTPS, gated behind an env flag. Or document a `docker-compose.tls.yml` extension that wires Caddy in.

**Size:** ~1 day.

### 16. Migration to a different DB engine
**Where:** Prisma schema + adapter.

**Today:** SQLite. Fine for single-container, single-user-team deployments. Once the org wants horizontal scale or cross-region replication, SQLite is the bottleneck.

**Fix:** evaluate Prisma's Postgres adapter behind the same schema. Consider Turso/libsql for SQLite-with-replication if the team wants to keep the SQLite ergonomics.

**Size:** depends. ~3 days minimum, much more if migrating live data.

---

## Cleanup / housekeeping

### 17. Pre-existing biome warnings
4 `noImportantStyles` warnings on the `prefers-reduced-motion` block in `globals.css`. Intentional CSS — the rule needs to override every animation/transition declaration. Either suppress the lint rule for that block or refactor with higher-specificity selectors.

### 18. Test parallelism vs shared SQLite
The test suite is configured `fileParallelism: false, maxWorkers: 1` because parallel files race on `prisma/test.db`. Either give every test file its own DB (parameterize `DATABASE_URL` per file) or accept the serial cost. Currently the serial cost is ~13s; not bad.

### 19. Empty thumbnail.png in `with-thumbnail.zip`
The fixture was created with only the PNG magic header (8 bytes). The thumbnail route now guards against this (≥ 64 bytes minimum), but the fixture itself should be either rebuilt with a real thumbnail or removed in favor of the new `lumen-coffee.zip` / `helio-pricing.zip` / `drone-console.zip`.

### 31. Radix latent migrations (DropdownMenu / Tooltip / Toast / Toolbar)

**Where:** four DS files declare posture (b) — "would use Radix X but it is NOT installed":
`09-avatar-menu.html`, `16-tooltip.html`, `17-toast.html`, `19-toolbar.html`.

**Today:** the project ships custom implementations of each surface — `usePopover` for the avatar menu, `popover="hint"` for tooltips, a context+reducer for toasts, and inline `<button>` groups for the canvas toolbar. Each implementation satisfies the consumer set and matches the DS contract.

**Trigger to migrate (per DS authoring rule):** install the Radix primitive only when the first consumer needs a capability the custom implementation does not provide. Concretely:

- **`@radix-ui/react-dropdown-menu`** — install when a second consumer of the menu pattern needs typeahead navigation, sub-menus, or item-checked states beyond plain action items. The current avatar menu and tree-row kebabs are flat action lists.
- **`@radix-ui/react-tooltip`** — install when a consumer needs `Tooltip.Provider`-coordinated open-delay timers across multiple tooltips, or pointer-events-on-content (e.g. a tooltip containing a copy-to-clipboard button). The current global hint popover is hover/focus only.
- **`@radix-ui/react-toast`** — install when a consumer needs swipe-to-dismiss, an action slot ("Undo"), or queue-limit policies. The current toast is fire-and-fade.
- **`@radix-ui/react-toolbar`** — install when `CanvasToolbar` gains ToggleGroup behaviour (e.g. pan/select/draw mode toggle), focus-roving across many controls, or visible separator semantics.

**On migration:** add the package in the same PR as the first consumer; update the DS file's React API section to switch from posture (b) to posture (a); update `docs/feature-catalog.md` for any new state (e.g. tooltip-with-action becomes a new sub-row).

**Size:** ~half a day per primitive (install, port one consumer, smoke test, doc update). Migrating all four at once is discouraged — each migration carries its own consumer-driven trigger.

---

## Agent collaboration efficiency (Tier 3 of v1.3 token-optimization analysis)

Items deferred from the v1.3 brainstorm `analyze-iteration-and-optimize`. Tier 1 (intent endpoint, agent-context aggregator, base64-strip) and Tier 2 (patch-style versioning, region screenshots, text diff) ship as part of v1.3. The structural items below are parked because they require schema changes and policy decisions, and only deliver leverage AFTER Tier 1+2 lands. G1 (manual chip tagging on annotation creation) ships now in v1.3 as the seed `intentType` column the items below build on.

### 20. G2 — LLM-derived intent classification at save time
**Where:** new server-side hook on `POST /api/mockups/[id]/annotations` + new `Annotation.aiIntent` JSON column.

**Today:** v1.3 ships G1 — a manual chip selector in the annotation modal that asks the user to tag the intent (`low_contrast`, `layout`, `copy`, `state`, `freeform`). Useful but optional; many users will leave it on freeform.

**Fix:** when an annotation is saved, kick off an async classification job that feeds (comment text + anchored DOM snippet + screenshot crop at the bbox) to a small LLM call. The model returns a structured payload: `{intent_type, severity (low/med/high), suggested_target_selector, summary, suggested_specialties: ["designer", "engineer"]}`. Persist as `Annotation.aiIntent`. Surfaced in the annotation page below the user's comment as "Suggested classification" with a small confidence badge.

**Why park it:** requires Anthropic / OpenAI SDK + API key plumbing + cost tracking + retry/cache logic. The G1 chip alone covers the common case at zero per-call cost; G2 is the upgrade path when (a) freeform comments dominate and (b) the team is comfortable with per-annotation LLM cost.

**Size:** ~2 days including SDK integration, prompt engineering, cost cap, tests with mocked provider.

### 21. H — Agent sub-role header
**Where:** `src/lib/auth/identify.ts` + `Message.authorSubRole` schema field + ThreadTimeline.

**Today:** every persona (`corrector-bot`, `designer-bot`, `qa-bot`) needs a separate `AgentToken` row, just to get a different display name in the thread. Tokens are heavy artifacts (DB row, hash, lifetime, audit log) for what is essentially a label.

**Fix:** keep one agent token per real automation client. Add a request header `X-Agent-Subrole: designer` (or `engineer` / `qa` / `pm` / etc.). `identify()` reads it and attaches it to the identity object. Reply / annotation creation routes persist it on `Message.authorSubRole`. ThreadTimeline shows the subrole as a small pill below the agent name (`corrector-bot · designer`). Validation: regex match + length cap, no enum (let teams define their own).

**Why park it:** independent and small (~half a day), but only worth shipping once the multi-persona pattern actually settles. Until v1.3 the project had one bot total — easier to wait until 3+ personas are in active use to know what UI treatment fits.

**Size:** ~half a day. Schema migration + identify() change + UI pill. Stand-alone, can be sequenced anytime after Tier 1+2.

### 22. I — Multi-agent routing / inbox
**Where:** new `Annotation.tags` (string[]) + new `AgentToken.specialties` (string[]) + new `/api/agent/inbox` endpoint + new agent-facing `/agent/inbox` page.

**Today:** any agent token can act on any annotation. There is no notion of "this comment is for the designer; this one is for the QA." A polling agent has to re-read every open annotation every cycle to find the ones it should touch.

**Fix:**
1. **Tagging:** annotations carry tags derived from G1 (manual) and/or G2 (LLM). `low_contrast` → `["design", "typography"]`. `state_missing` → `["engineer", "react"]`. Etc.
2. **Specialties on token:** `AgentToken.specialties` is the set of tag prefixes the agent watches.
3. **Inbox endpoint:** `GET /api/agent/inbox` returns the open annotations matching the calling token's specialties, ordered by age × severity. Optimistic claim: each result has a `claim_token`; agent calls `POST /api/annotations/[id]/claim` with the token; first-write-wins, others get 409. Lease expires after 10min unless the agent posts a reply or releases.
4. **User-facing:** annotations show a small `→ designer` chip when a specialty is auto-attached; it changes to `claimed by designer-bot · 2 min ago` once an agent picks it up.
5. **Conflict / fallback:** if no token specializes in a tag, the annotation falls back to the global pool. Admin can override the routing on any annotation.

**Why park it:** the biggest of the three by far (~3.5d) and the only one that depends on G being done first (G1 minimum, G2 ideal). Also the only one with concurrency concerns (claim races, lease expiry). Worth doing only once the team has 2+ active agents AND enough annotation volume that manual triage hurts. Closely related to **#7 multi-agent role taxonomy** in P1 — those two should be specced together when revisited (role governs CAN-DO permissions; specialty governs SHOULD-DO routing).

**Size:** ~3.5 days. Schema migrations, claim/lock concurrency, inbox endpoint, agent dashboard page, user-facing pills, end-to-end tests for claim races.

### Summary — when to revisit
- **20 (G2):** when freeform comments outpace the chip selector and the per-annotation LLM cost is acceptable. Probably v1.5.
- **21 (H):** when a 3rd or 4th agent persona is added in active deployment. Easy bolt-on whenever.
- **22 (I):** when annotation volume × persona count makes manual triage a bottleneck. Co-spec with #7.

---

## AppMain redesign — parked surfaces

Surfaces removed from the mockup viewer in the 2026-05 redesign. The
viewer focuses on commenting; diff and edit-mode return as separate
specs. Spec: `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md`.

### 24. View diff modal

**Where:** mockup viewer toolbar `View diff` button + diff modal.

**Today:** diff is text-only via `GET /api/mockups/[id]/diff`. The viewer toolbar has no diff button.

**Fix:** restore the inline diff view, ideally as a side-by-side or overlay diff using the existing diff API. Could be implemented as a new fullscreen mode rather than a modal.

**Why park it:** diff UX is its own design problem — depends on what "diff" means (visual? structural? text?). Worth specifying separately.

**Size:** ~3 days depending on diff representation.

### 25. Edit-mode toggle + Pan/Select/Fit tools

**Where:** mockup viewer toolbar.

**Today:** the viewer has a single mode (comment). No pan / select / fit-to-screen tools.

**Fix:** Pan / Select / Fit are nice-to-haves but the floating-cockpit design with zoom + fullscreen covers the common cases.

**Why park it:** Pan/Select tools don't add enough value over zoom + fullscreen to justify the toolbar real estate.

**Size:** ~1 day for pan/select/fit if desired.

### 26. Global keyboard-shortcut hook (`useShortcuts`)

**Where:** new `src/lib/shortcuts/useShortcuts.ts` + wiring in `AppMainViewer`.

**Today:** the AnnotationsRail header shows the `⌘⇧N` hint next to the "+ New annotation" button, but no global keydown handler exists. Pressing the chord does nothing. Same gap for `⌘=`/`⌘-`/`⌘0` (zoom), `F` (fullscreen), `⌘⇧V` (versions). Only the in-composer `Escape` is wired.

**Fix:** implement the hook per spec §13: register a single document-level keydown listener, gate on the OS-aware modifier (via `isMod`), guard against IME composition + form-field focus, dispatch to a registry of `{combo, handler}` pairs the viewer registers on mount. Add OS-aware tooltip strings (`formatShortcut(['shift','n'])`).

**Why park it:** the visible affordance ships (the hint label), all click paths work — keyboard parity is a clear v1.1 follow-up rather than a launch blocker.

**Size:** ~half a day.

### 27. Per-mockup auth on reactions endpoint

**Where:** `src/app/api/messages/[id]/reactions/route.ts`.

**Today:** the route calls `identify(req)` and proceeds as long as the caller is authenticated. There is no JOIN to verify the message → thread → annotation → mockup chain is in a project the caller can access.

**Fix:** fetch the message with its thread → annotation → mockup, and reuse the same access check the annotations endpoints apply (currently a single-tenant assumption — when multi-tenant lands the check goes in at the boundary).

**Why park it:** Markup is single-tenant today; the gap is real but theoretical. Should be closed before any multi-tenant work.

**Size:** ~1 hour (write once the access helper exists).

### 28. Mockup iframe trust boundary

**Where:** `src/app/(app)/mockups/[id]/components/AppMainViewer.tsx` iframe + `src/app/m/[mockupId]/[[...path]]/route.ts` serve + `src/lib/csp.ts`.

**Today:** mockups are served same-origin and the iframe has no `sandbox` attribute. The mockup CSP allows `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, so any uploaded mockup HTML can run script, and that script can reach the parent window's API surface via `window.parent.fetch('/api/…', { credentials: 'include' })` — including admin-only endpoints like `POST /api/agent-tokens`. Effectively: uploading a mockup is equivalent to running JavaScript in the admin's browser.

**Status:** pre-existing on `main` (the deleted `MockupViewer.tsx` had the same arrangement). The redesign's new click capture is read-only DOM access — it does not widen the boundary, only inherits it. Flagged here so the trust model is on record.

**Fix path:**
- Short term — document the trust model in `docs/agent-loop/`: "uploading a mockup = running script in the admin's browser; only upload mockups you trust." Add `Set-Cookie SameSite=Strict` on the session if not already; drop `'unsafe-eval'` from the mockup CSP (most mockups don't need it).
- Long term — serve `/m/[mockupId]/…` from a separate origin (e.g. `mockup-content.markup.alego.cloud`) so the iframe is natively cross-origin, then proxy click coordinates via `postMessage` instead of reading the iframe DOM from the outer document. The anchoring runtime already has the cross-document scaffolding (`useAnchoredPins` detects `ownerDocument` mismatch) — the missing piece is replacing direct rect reads with a `postMessage` RPC since CORS blocks `getBoundingClientRect` on cross-origin documents.

**Size:** trust-model doc + cookie hardening ~1 hour. Cross-origin serve + postMessage bridge ~1-2 days.

### 29. Inline comment edit textarea

**Where:** `src/components/Comment/Comment.tsx`.

**Today:** `comment-kebab` → Edit fires a `window.prompt()` for the new body. Functional but jarring and breaks the glass aesthetic — the prompt is a plain OS dialog.

**Fix:** add a local `editing` state to `Comment`. When `onEdit` fires, replace the body span with a textarea (pre-filled with current body) + Save / Cancel buttons. Save calls a new `onSaveEdit(commentId, nextBody)` callback that the parent wires to the PATCH endpoint. Cancel reverts. Same UX for primary and reply variants.

**Why park it:** the API is wired (`PATCH /api/messages/[id]`), Edit reaches the backend and persists — the only gap is the input affordance. v1.1 polish.

**Size:** ~2 hours including styling matching the reply textarea.

### 30. Legacy DS mockup overhaul to glass-surface standard

**Where:** `docs/design/design-system/01-sidebar.html`, `02-breadcrumb.html`, `03-finder-pill.html`, `04-finder-overlay.html`, `05-project-card.html`, `06-icon-picker.html`, `08-dropdown-chevron.html`, `09-avatar-menu.html`, `10-agent-tokens.html`, `11-mockup-view.html`, `12-project-folder-view.html`, `13-buttons.html`, and `docs/design/full-prototype.html`.

**Today:** these mockups predate the `glass-surface-standard` introduced in `src/styles/glass.module.css`. They use inline legacy values: `background: rgba(14,12,16,0.92); backdrop-filter: blur(16px)`. The shipped components now resolve to `background: var(--surface-glass-bg) /* rgb(7 12 15 / 80%) */; backdrop-filter: blur(16px) saturate(140%); border: 1px solid var(--border)`. The two are visually close but not pixel-perfect.

The Tarefa 5 ultrareview ("Tarefa 5 aceitou outros mockups considerados alinhados sem verificação detalhada") flagged the gap; Tarefa 11 audited it, parked it as a separate effort, and synced prod (`markup.alego.cloud > Markup dev > Design System`) with the current HEAD HTML — so prod reflects truth, the truth just isn't pixel-perfect yet.

**Fix:** rewrite each mockup's glass treatment to use the new `--surface-glass-bg` / `--surface-glass-blur` / `--surface-glass-border` tokens and the saturate-140% filter. Replace any token-divergent values with the up-to-date `tokens.css` definitions. Re-test visually against the live component, then upload new versions to prod (`POST /api/mockups/{id}/version`). The 7 new mockups (14-20) shipped in Tarefa 5 already use the new standard and are aligned.

**Size:** ~3 hours per group; budget half a day for the 12 component mockups + half a day for `full-prototype.html` (~2500 lines). Lower priority: divergence is < 5% of pixel-perfect (saturation + tint), no functional regression.

---

## Coverage: large UI components without tests

Seven large UI components (and one hook) lack test coverage:

- `components/ProjectTree/ProjectTree.tsx` (387 LOC, drag-drop orchestrator)
- `components/ProjectTree/TreeNode.tsx` (364 LOC, dense event handling)
- `components/ProjectTree/TreeNodeKebab.tsx` (169 LOC, confirm-on-delete dialog)
- `components/NewProjectDialog/NewProjectDialog.tsx` (179 LOC, form validation + icon picker)
- `components/PinLayer/PinLayer.tsx` (176 LOC, `useAnchoredPins` integration)
- `components/MockupViewer/ViewerCanvas.tsx` (176 LOC, iframe + pin-click bridge)
- `components/ThreadTimeline/ThreadTimeline.tsx` (175 LOC, reply form + message list)
- `lib/popover/usePopover.ts` (93 LOC, beforetoggle handler)

Each lives above the typical "small component, simple test" threshold and contains non-trivial state machines or event flows. Adding their tests raises coverage by an estimated +4–6pp lines.
