# Documentation Index

Start here to find which docs apply to your task. If multiple docs are relevant, read all of them before starting.

## Start here

- [Task Rules](task-rules.md) — what to do before/after every task; the per-area checklist
- [CI and coding rules](ci.md) — what fails CI, the pre-push checklist, and the conventions the agent must follow to keep `main` green
- [Quality Gate](quality-gate.md) — multi-metric ratchet (coverage, lint, duplication, file size, security) against the `quality-metrics` orphan branch
- [Documentation Standards](doc-standards.md) — how to write and maintain docs (snapshot-only, declarative present tense)
- [Git Conventions](git/conventions.md) — commit messages and workflow

## Whole project

- [Stack](stack.md) — frameworks, libraries, runtime, container layout
- [Recovery](recovery.md) — rollback, reset scripts, data restore, smoke test
- [Deploy](deploy.md) — CD pipeline, self-hosted runner architecture, manual deploy, rollback
- [Code Style](code-style.md) — TypeScript + biome conventions
- [Testing](testing.md) — Vitest patterns, fixtures, the shared `prisma/test.db` rule
- [Tooling](tooling.md) — pnpm scripts, Prisma migrate, one-shot scripts under `scripts/`
- [QA dev flow](qa-dev-flow.md) — local dev server + seeded DB + Cloudflare tunnel for fast visual validation before pushing to `main`

## API

- [API INDEX](api/INDEX.md) — all routes grouped by surface
- [Routes](api/routes.md) — naming, params handling, `force-dynamic` rule
- [Auth](api/auth.md) — `identify()` accepts cookie OR Bearer; `kind: 'user' | 'agent'`
- [Storage](api/storage.md) — `DATA_DIR` layout, sidecar files, atomic writes

## Data

- [Schema](data/schema.md) — Prisma models and relationships
- [Migrations](data/migrations.md) — adding columns, backfilling, applying to `prisma/test.db`

## Frontend

- [Frontend INDEX](frontend/INDEX.md) — entry point
- [Components](frontend/components.md) — CSR-only convention, file layout, composition rules
- [Data fetching](frontend/data-fetching.md) — `useRequireAuth`, fetch + useEffect pattern, aggregator endpoints
- [Styling](frontend/styling.md) — `tokens.css`, OKLCH palette, `:focus-visible` global rule, `prefers-reduced-motion` policy

## Agent loop (STRICT contract surface)

- [Agent-loop INDEX](agent-loop/INDEX.md) — overview + endpoint map
- [Overview](agent-loop/overview.md) — the user→agent→user cycle
- [Endpoints](agent-loop/endpoints.md) — `/intent`, `/context`, `/version-patch`, `/diff`
- [Intent payload](agent-loop/intent-payload.md) — what `/intent` returns, sidecar caching, invalidation
- [Patch format](agent-loop/patch-format.md) — unified-diff conventions for `/version-patch`
- [Chips](agent-loop/chips.md) — G1 intent vocabulary (`visual` / `copy` / `behavior` / `other`)

## Feature catalog

- [Feature Catalog](feature-catalog.md) — exhaustive inventory of every user-visible surface, interaction, state, and animation; single source of truth for visual-QA

## Design

- [Full prototype](design/full-prototype.html) — the authoritative full-fidelity prototype (synced from Markup online)
- [Design system spec](design/design-system/UX_SPEC.md) — UX spec with design tokens, patterns, and component inventory
- `design/design-system/*.html` — DS component mockups synced from "Markup dev" project (sidebar, breadcrumb, finder-pill, finder-overlay, project-card, icon-picker, new-project-dialog, dropdown-chevron, avatar-menu, agent-tokens, mockup-view, project-folder-view, buttons, dialog, popover, tooltip, toast, annotations-rail, canvas-toolbar, pins, invites, new-invite-dialog, invite-signup, drop-overlay, new-mockup-dialog, empty-state)

### Active design specs (forward-looking)

- [AppMain redesign](superpowers/specs/2026-05-18-app-main-redesign-spec.md) — floating-cockpit viewer layout, threaded annotations, reactions, glass surface standard, OS-aware shortcuts
- [Pin anchoring strategy](superpowers/specs/2026-05-18-pin-anchoring-strategy.md) — DOM-anchored pin positioning resilient to viewport/zoom/fullscreen/reflow

## Process artefacts (point-in-time, local-only)

These directories are gitignored — they hold dated, run-scoped artefacts that don't belong in version control:

- `docs/superpowers/specs/` — design specs from brainstorming runs
- `docs/superpowers/plans/` — implementation plans
- `docs/qa/` — visual-QA reports
- `docs/design/ideias/` — exploratory navigation/UI variants (`design-feature` workflow drops them here)
- `docs/design/mockups/` — dated single-mockup explorations
- [`docs/future-features.md`](future-features.md) — parked scope, declarative present tense (this one IS tracked)
