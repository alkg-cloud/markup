# Project Instructions

## Documentation-first rule

Before writing any code, **read the relevant documentation** in `docs/`.

Use [`docs/INDEX.md`](docs/INDEX.md) to find which docs apply to your task. If multiple docs are relevant, read all of them before starting.

**This is non-negotiable.** Never skip this step regardless of how simple the change appears.

## Documentation as source of truth

Documentation in `docs/` is the contract for behaviour, conventions, and architecture. When the documentation and the code disagree, the documentation wins by default. The agent must either (a) align the code to the documentation, or (b) propose a documentation amendment and obtain explicit user approval **before** changing the code. **Silent divergence is forbidden.**

Any change that adds, removes, or alters behaviour, a convention, or an architectural decision **must** update the relevant doc in the same change-set — ideally before writing code, so the doc edit defines the contract the code is then written against.

## Client-side rendering rule (STRICT — non-negotiable)

Markup renders **exclusively on the client**. Server-side rendering of UI is forbidden.

Concretely:

- **Every `page.tsx`, every `layout.tsx`, and every shell component is a client component** (`'use client'` at the top). No `async function Page()` server components, no `await prisma.…` inside a page or layout, no `next/headers` imports outside of API routes.
- **All UI data-fetching happens in the client**, via `fetch('/api/…')` against the route handlers under `src/app/api/**`. Pages own loading + error states.
- **API routes (`src/app/api/**`) remain server-side** — they are HTTP endpoints, not SSR. They keep `export const dynamic = 'force-dynamic'` where they read cookies/headers/DB. The `/m/[mockupId]/[...path]/route.ts` mockup-serve route also remains server-side.
- **Auth gating** is the responsibility of (a) `src/middleware.ts` (cookie-presence redirect for unauthenticated traffic to `(app)` routes) and (b) a client-side `useRequireAuth()` hook that calls `/api/auth/me` and redirects to `/login` on 401. Pages and layouts must not call `identify()` — that helper is for API routes only.
- **Root `src/app/layout.tsx`** stays server-rendered only to set up `<html>`, fonts, and metadata. It must not fetch data. The `<body>` mounts a client shell that handles every interactive concern.
- **`next.config.mjs` does NOT switch to `output: 'export'`.** The project continues to run as a Next.js server (dev / standalone build) so API routes work; only the UI render is client-only.

When in doubt: if it imports Prisma, reads cookies, or awaits DB rows, it belongs in an API route. The UI calls that API route via `fetch` and renders the result client-side.

## Snapshot-only docs

Every doc under `docs/` is a **snapshot of what ships at HEAD**, not a journal. Forbidden in doc bodies:

- Status bands (`Status: shipped`, `Resolved: …`, `Reconciled: …`)
- Tombstones for removed features
- Changelog bands (`amendment YYYY-MM-DD`, `Action: amended`)
- Date stamps (`as of YYYY-MM-DD`, `iter-N`, `v1.3 design language`)
- Reconciliation banners at the top of files recording past rollbacks

Entries are written in **declarative present tense**. Every paragraph describes only what currently ships. When something is added, removed, or amended, edit the doc body in place — add, restate, or delete. The journal of when each entry changed lives in `git log -- <file>`, not in the file itself.

Point-in-time artefacts (audit reports, brainstorm notes, plan documents) live in dated folders **outside the snapshot docs and outside version control**:

- `docs/qa/<date>-…` — visual-QA passes (gitignored)
- `docs/superpowers/specs/<date>-…` — design specs from brainstorming (gitignored)
- `docs/superpowers/plans/<date>-…` — implementation plans (gitignored)
- `docs/future-features.md` — backlog of unbuilt scope, written in declarative form (no dates) — this one IS tracked

The gitignored directories hold per-run artefacts that don't belong in shared history; what each run produces of lasting value rolls up into the tracked snapshot docs (`docs/api/`, `docs/agent-loop/`, etc.) or into `docs/future-features.md` for parked scope. The snapshot docs do not link to specific dated artefacts since those references rot every time the local working copy is cleaned.

## Agent-loop rule (STRICT — non-negotiable)

Markup is a **mockup review platform whose primary user is an automation agent** (LLM-driven or otherwise). The agent loop — annotation → intent extraction → fix → reply — is a first-class product surface, not a side path.

The endpoints that compose the agent loop are documented in [`docs/agent-loop/`](docs/agent-loop/INDEX.md). When changing any of:

- `POST /api/mockups/[id]/annotations` (annotation creation, including `intent_type`)
- `GET /api/annotations/[id]/intent` (server-side parsed intent + DOM resolution)
- `GET /api/agent/context/[annotationId]` (single-call aggregator)
- `PATCH /api/mockups/[id]/version-patch` (unified-diff versioning)
- `GET /api/annotations/[id]/region` (bbox-cropped screenshot)
- `GET /api/mockups/[id]/diff` (text-mode diff API)
- `PUT /api/annotations/[id]/tldraw` (drawing edit persistence)

…the agent must:

1. Read the matching doc in `docs/agent-loop/` end to end.
2. Update the doc **first** if the change alters the contract (response shape, auth model, cache key, error code).
3. Verify token-cost claims (`intent.json` sidecar size, `/context` payload size, patch body size) still hold; if not, restate them in the doc.

The contract docs make the agent loop **predictable for automation clients that aren't this agent**. Silent drift in any of these endpoints breaks the orchestrators that depend on the published shape — whether they're AI dev assistants (Claude Code, Cursor, Aider), agent frameworks (LangGraph, CrewAI, AutoGen), or in-house CI integrations.

## Feature-catalog freshness (STRICT — non-negotiable)

[`docs/feature-catalog.md`](docs/feature-catalog.md) is the **exhaustive inventory of every user-visible surface** in Markup. Visual-QA, visual-refine, and any UI-touching task tests against it.

Any PR that **adds, removes, or changes a user-visible interaction, state, animation, or surface** MUST update `docs/feature-catalog.md` in the same changeset:

1. **New surface** → add a row with a stable kebab-case ID, surface description, and states.
2. **Removed surface** → delete the row (no tombstone).
3. **Changed behaviour** → rewrite the row to match the new behaviour.
4. **New animation** → add to the Animation inventory table.
5. **New agent-loop surface** → add to the Agent-loop surfaces table.

The catalog uses stable IDs (e.g. `sidebar-tree-expand`, `annotation-modal-chip`) so issues, screenshots, and QA reports can reference surfaces durably across time. Never rename an ID without grepping for references first.

Reference the catalog in issue titles and descriptions using the `[fc:<id>]` convention (e.g. `[fc:sidebar-tree-dnd-keyboard]`).

## Mockup-sync rule (STRICT — non-negotiable)

The project **"Markup dev"** on `markup.alego.cloud` is the living visual mirror of the current design state. Structure: folder **"Design System"** (individual component mockups), folder **"Ideias"** (exploratory mockups), and **"full-prototype"** at the project root.

**Upload:** every mockup the agent generates (DS component, prototype, exploratory) MUST be uploaded to `markup.alego.cloud` in the correct project and folder via `POST /api/mockups` (with `projectId` + `folderId`).

**Versioning:** when the agent modifies an existing mockup, it MUST upload a **new version** (`POST /api/mockups/[id]/version`), never create a new mockup. The version history on markup.alego.cloud is the audit trail.

**DS cascade:** when a Design System component mockup is changed, the agent MUST:

1. Identify which other DS mockups depend on the changed component (e.g. chevron change → 01-Sidebar → full-prototype).
2. Update each dependent DS mockup as a new version.
3. Update the full-prototype as a new version.

**Folder governance:** the agent does NOT create new folders or projects on markup.alego.cloud without explicit user approval. If the agent judges a new folder is needed, it MUST ask the user first.

**Invariant:** at any point in time, markup.alego.cloud reflects the current design state of the project. Stale mockups are a bug.

## Design pipeline rule (STRICT — non-negotiable)

Mockups on "Markup dev" are the **source of truth for design**. The flow is **unidirectional: mockup → code**. The agent never modifies mockups on its own initiative — only when explicitly asked by the user.

Pipeline for a new feature or visual adjustment:

1. **Ideias** — agent or user creates an exploratory mockup in the "Ideias" folder of "Markup dev" on markup.alego.cloud.
2. **Iteration** — user reviews and requests adjustments; each adjustment is uploaded as a new version of the same mockup.
3. **Approval** — user explicitly approves the mockup.
4. **Promotion** — approved mockup is promoted: the component goes to "Design System" (new version of existing DS mockup, or new DS mockup if it's a new component), full-prototype is updated, and `docs/feature-catalog.md` is updated with the new surfaces/behaviors.
5. **Implementation** — code is written to faithfully replicate the approved DS.

The code MUST follow **faithfully** what is defined in the Design System. The full-prototype reflects what is implemented in code. If there is divergence between code and DS, **the DS wins** — the code must be adjusted to match.

## Mockup-replication rule (when the user points at a fixture)

When the user points at a fixture under `tests/fixtures/mockups/<name>.zip` (e.g. `lumen-coffee.zip`, `helio-pricing.zip`, `drone-console.zip`) and asks the agent to replicate it, modify it, or use it as a visual reference for a feature, the agent MUST:

1. Read the fixture's `index.html` end to end before writing any code.
2. List every behaviour, UX rule, and style invariant the fixture expresses (drop caps, tilted cards, dark callout patterns, hover/focus/active states, etc.).
3. State which of those will appear in the change and which will not. Get user acknowledgement before proceeding.

Eyeballing the fixture and writing code without enumerating its surface produces silent drift — the kind of "looks similar but loses the issue-strip / specimen card / dropcap" failure that the elaborate fixtures were created to prevent.

## Quick reference

- **Doc index (start here):** [`docs/INDEX.md`](docs/INDEX.md)
- **Task rules (before/after every change):** [`docs/task-rules.md`](docs/task-rules.md)
- **CI and coding rules (read before touching code):** [`docs/ci.md`](docs/ci.md)
- **Stack:** [`docs/stack.md`](docs/stack.md)
- **API conventions:** [`docs/api/INDEX.md`](docs/api/INDEX.md)
- **Agent loop:** [`docs/agent-loop/INDEX.md`](docs/agent-loop/INDEX.md)
- **Frontend:** [`docs/frontend/INDEX.md`](docs/frontend/INDEX.md)
- **Schema + migrations:** [`docs/data/schema.md`](docs/data/schema.md)
- **Git conventions:** [`docs/git/conventions.md`](docs/git/conventions.md)
- **Feature catalog (visual-QA source of truth):** [`docs/feature-catalog.md`](docs/feature-catalog.md)
- **Backlog (parked features):** [`docs/future-features.md`](docs/future-features.md)
