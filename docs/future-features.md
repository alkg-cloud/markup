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

### 14. tldraw production license
**Where:** `AnnotationModal.tsx` + `AnnotationCanvas.tsx`.

**Today:** the eval watermark "Get a license for production" shows in the bottom-right of every drawing canvas. Acceptable for personal/internal use; not shippable to a wider audience.

**Fix:** acquire a tldraw SDK license, plumb the license key through the editor mount, OR replace the drawing layer with an in-house SVG / canvas implementation if the licensing cost is prohibitive.

**Size:** licensing decision + ~1 day of integration work.

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

---

## Agent collaboration efficiency (Tier 3 of v1.3 token-optimization analysis)

Items deferred from the v1.3 brainstorm `analyze-iteration-and-optimize`. Tier 1 (intent endpoint, agent-context aggregator, base64-strip) and Tier 2 (patch-style versioning, region screenshots, text diff) ship as part of v1.3. The structural items below are parked because they require schema changes and policy decisions, and only deliver leverage AFTER Tier 1+2 lands. G1 (manual chip tagging on annotation creation) ships now in v1.3 as the seed `intentType` column the items below build on.

### 20. G2 — LLM-derived intent classification at save time
**Where:** new server-side hook on `POST /api/mockups/[id]/annotations` + new `Annotation.aiIntent` JSON column.

**Today:** v1.3 ships G1 — a manual chip selector in the annotation modal that asks the user to tag the intent (`low_contrast`, `layout`, `copy`, `state`, `freeform`). Useful but optional; many users will leave it on freeform.

**Fix:** when an annotation is saved, kick off an async classification job that feeds (drawing summary + comment text + screenshot crop at the bbox) to a small LLM call. The model returns a structured payload: `{intent_type, severity (low/med/high), suggested_target_selector, summary, suggested_specialties: ["designer", "engineer"]}`. Persist as `Annotation.aiIntent`. Surfaced in the annotation page below the user's comment as "Suggested classification" with a small confidence badge.

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
viewer focuses on commenting; drawing/diff/edit-mode return as separate
specs. Spec: `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md`.

### 23. Drawing canvas (tldraw)

**Where:** annotation modal canvas, annotation detail canvas, edit-mode toggle, save flow.

**Today:** annotations are comment-only. Pins anchor to DOM elements via the anchoring strategy. No freehand drawings or shapes.

**Fix:** reintroduce the tldraw overlay as an OPTIONAL annotation kind. The current Annotation row keeps `anchors[]` for pin-based annotations; a new `kind` discriminator distinguishes "comment" (anchors) from "drawing" (tldraw blob). Restore the screenshot capture + tldraw save flow when needed.

**Why park it:** mockups change frequently; drawings drift from content faster than DOM-anchored pins. Comment-only is the high-signal default.

**Size:** ~2 days (mostly UI restoration — tldraw worked previously).

### 24. View diff modal

**Where:** mockup viewer toolbar `View diff` button + diff modal.

**Today:** diff is text-only via `GET /api/mockups/[id]/diff`. The viewer toolbar has no diff button.

**Fix:** restore the inline diff view, ideally as a side-by-side or overlay diff using the existing diff API. Could be implemented as a new fullscreen mode rather than a modal.

**Why park it:** diff UX is its own design problem — depends on what "diff" means (visual? structural? text?). Worth specifying separately.

**Size:** ~3 days depending on diff representation.

### 25. Edit-mode toggle + Pan/Select/Fit tools

**Where:** mockup viewer toolbar.

**Today:** the viewer has a single mode (comment). No pan / select / fit-to-screen tools.

**Fix:** edit-mode returns with drawing (#23). Pan / Select / Fit are nice-to-haves but the floating-cockpit design with zoom + fullscreen covers the common cases.

**Why park it:** depends on #23. Pan/Select tools without drawing don't add enough value to justify the toolbar real estate.

**Size:** comes with #23, +1 day for pan/select/fit if desired.

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
