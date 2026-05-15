# Documentation Index

Start here to find which docs apply to your task. If multiple docs are relevant, read all of them before starting.

## Start here

- [Task Rules](task-rules.md) — what to do before/after every task; the per-area checklist
- [CI and coding rules](ci.md) — what fails CI, the pre-push checklist, and the conventions the agent must follow to keep `main` green
- [Documentation Standards](doc-standards.md) — how to write and maintain docs (snapshot-only, declarative present tense)
- [Git Conventions](git/conventions.md) — commit messages and workflow

## Whole project

- [Stack](stack.md) — frameworks, libraries, runtime, container layout
- [Recovery](recovery.md) — rollback, reset scripts, data restore, smoke test
- [Deploy](deploy.md) — CD pipeline that ships every push to main to `markup.alego.cloud`
- [Code Style](code-style.md) — TypeScript + biome conventions
- [Testing](testing.md) — Vitest patterns, fixtures, the shared `prisma/test.db` rule
- [Tooling](tooling.md) — pnpm scripts, Prisma migrate, one-shot scripts under `scripts/`

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
- [Components](frontend/components.md) — server vs client, state ownership, file layout
- [Styling](frontend/styling.md) — `tokens.css`, OKLCH palette, `:focus-visible` global rule, `prefers-reduced-motion` policy
- [Tldraw integration](frontend/tldraw.md) — snapshot model, base64 strip, StrictMode dedup, edit-mode toggle

## Agent loop (STRICT contract surface)

- [Agent-loop INDEX](agent-loop/INDEX.md) — overview + endpoint map
- [Overview](agent-loop/overview.md) — the user→agent→user cycle
- [Endpoints](agent-loop/endpoints.md) — `/intent`, `/context`, `/version-patch`, `/region`, `/diff`, `/tldraw`
- [Intent payload](agent-loop/intent-payload.md) — what `/intent` returns, sidecar caching, invalidation
- [Patch format](agent-loop/patch-format.md) — unified-diff conventions for `/version-patch`
- [Chips](agent-loop/chips.md) — G1 intent vocabulary (`visual` / `copy` / `behavior` / `other`)

## Feature catalog

- [Feature Catalog](feature-catalog.md) — exhaustive inventory of every user-visible surface, interaction, state, and animation; single source of truth for visual-QA

## Design

- [Full prototype](design/full-prototype.html) — the authoritative full-fidelity prototype (synced from Markup online)
- [Design system spec](design/design-system/UX_SPEC.md) — UX spec with design tokens, patterns, and component inventory
- `design/design-system/*.html` — 13 DS component mockups synced from "Markup Dev" project (sidebar, breadcrumb, finder-pill, finder-overlay, project-card, icon-picker, new-project-dialog, dropdown-chevron, avatar-menu, agent-tokens, mockup-view, project-folder-view, buttons)
- `design/ideias/` — navigation variant explorations and sidebar ideas (synced from Markup online + local variants)

## Process artefacts (point-in-time, local-only)

These directories are gitignored — they hold dated, run-scoped artefacts that don't belong in version control:

- `docs/superpowers/specs/` — design specs from brainstorming runs
- `docs/superpowers/plans/` — implementation plans
- `docs/qa/` — visual-QA reports
- [`docs/future-features.md`](future-features.md) — parked scope, declarative present tense (this one IS tracked)
