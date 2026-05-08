# Task Rules

## Before any change

Read [`docs/INDEX.md`](INDEX.md) to find which docs apply to your task. If multiple docs are relevant, read all of them before starting. This is non-negotiable regardless of how simple the change appears.

If the change touches an agent-loop endpoint (`/intent`, `/context`, `/version-patch`, `/region`, `/diff`, `/tldraw`, or `POST /annotations`), consult [`docs/agent-loop/`](agent-loop/INDEX.md) **before** writing code. See the [agent-loop rule](../CLAUDE.md#agent-loop-rule-strict--non-negotiable).

If the change replicates a `tests/fixtures/mockups/<name>.zip` fixture (lumen-coffee, helio-pricing, drone-console), follow the [mockup-replication rule](../CLAUDE.md#mockup-replication-rule-when-the-user-points-at-a-fixture).

## Before pushing

Run every command CI would trigger for your diff. **Every command must exit 0 locally before push.**

```bash
pnpm exec biome check .         # lint + format check
pnpm exec tsc --noEmit          # typecheck
pnpm test                       # vitest (102 baseline + new)
pnpm build                      # next build (catches build-only TS errors)
```

The full list lives in [`docs/ci.md`](ci.md#pre-push-checklist).

## Coding rules that keep CI green

[`docs/ci.md`](ci.md) documents the concrete TypeScript, biome, Prisma, and workflow conventions that any new code must respect.

## Keep documentation up to date

After every change, evaluate whether the documentation needs to be updated or a new doc needs to be created. If a pattern, convention, or architectural decision changes, the docs **must** reflect it before the work is considered done.

Prefer updating the docs **first** — write the contract, then write the code that satisfies it. This avoids the failure mode where docs silently lag behind shipped behaviour.

### Agent-loop docs are the primary contract

Any change to an agent-loop endpoint's response shape, auth model, error code, or cache key must update the matching doc in `docs/agent-loop/` in the same change-set. These contracts are what automation clients (Paperclip and similar) depend on; silent drift breaks them.

What this looks like:

- New field added to `/intent` response → extend the response-shape table + show in the example payload
- New error code on `/version-patch` → add to the error table with status code + when it fires
- Cache key composition changes (e.g. adding `intent_version` to the key) → update the cache-strategy section

### Schema migrations need three places

Adding or modifying a Prisma model means:

1. Update `prisma/schema.prisma`
2. Generate the migration with `pnpm prisma migrate dev --name <description>`
3. Update [`docs/data/schema.md`](data/schema.md) with the new field/relation
4. Apply to the test DB: `DATABASE_URL='file:./prisma/test.db' pnpm prisma migrate deploy`

The migration file in `prisma/migrations/<timestamp>_<name>/migration.sql` and the generated client are committed; `prisma/dev.db` and `prisma/test.db` are gitignored.

## Per-area pre-push checklists

### API change

- New routes export `dynamic = 'force-dynamic'` (or document the reason if not)
- Auth check via `identify(req)` returning `{kind: 'user' | 'agent', ...}`
- Error responses match the `{ error: 'snake_case_code' }` shape — see [`docs/api/routes.md`](api/routes.md)
- New integration test under `tests/integration/api/<route>.test.ts`

### Frontend change

- Component states cover `:hover`, `:focus-visible`, `:active`
- New design tokens go in `src/styles/tokens.css`, not inline
- `prefers-reduced-motion` overrides accompany every new `@keyframes` rule
- New routes/pages added to `src/app/` follow the `page.tsx` server component + `*Client.tsx` client component pattern when interactivity is needed

### Schema change

- Migration generated and applied to `prisma/dev.db` AND `prisma/test.db`
- Backfill SQL in the migration if existing rows need a non-null value
- [`docs/data/schema.md`](data/schema.md) updated with the new field

### Agent-loop change

- Matching doc in [`docs/agent-loop/`](agent-loop/INDEX.md) updated **first**
- Integration test covers the new behaviour
- If the cache key changes, the invalidation path is updated in `src/lib/intent/cache.ts`

## Documentation must be reviewed before declaring done

Before declaring a task done, re-read the docs that govern the changed surface and verify the changes are reflected. If you touched two surfaces (e.g. API + frontend), re-read both halves.
