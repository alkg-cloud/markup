# CI and coding rules

The single CI workflow runs five jobs on every push. Read this before changing any file — the rules here keep `main` green.

## The pipeline

| Job | Command | What fails CI |
|---|---|---|
| `lint` | `pnpm exec biome check .` | Any lint error or format diff. Warnings do not fail CI; errors do. |
| `typecheck` | `pnpm exec tsc --noEmit` | Any TS error. The pre-existing `baseUrl` deprecation warning is informational. |
| `build` | `pnpm build` (Next 16 + Turbopack) | TS errors that only surface at build time, missing imports, or build-config issues. |
| `test-coverage` | `pnpm test --coverage` + `scripts/coverage-ratchet.ts` | Any failing assertion across unit + integration suites, OR a coverage drop of more than 0.10pp on any of lines/statements/functions/branches vs the baseline on the `coverage-data` branch. |
| `e2e` | `pnpm test:e2e` (Playwright) | Any failing e2e assertion. The job installs Chromium via `playwright install --with-deps`. |

All five jobs run in parallel from the same `actions/checkout` + `pnpm install` prelude.

## Coverage

`test-coverage` gates merges on a ratchet: each metric (lines, statements, functions, branches) must not drop more than 0.10pp below the baseline stored in the orphan branch `coverage-data`. On every `main` push, the job force-pushes the new baseline + a `shields.io`-shaped `badge.json` + the lcov HTML report to that branch.

The README coverage badge reads `badge.json` via raw GitHub. Two implications:

- The orphan branch never accumulates history (force-pushed). Fine for an artifact branch.
- The badge 404s until the first `main` push writes the `coverage-data` branch.

See [`docs/testing.md`](testing.md) for the engineer-facing details.

## Pre-push checklist

```bash
pnpm exec biome check .
pnpm exec tsc --noEmit
pnpm test
pnpm build
# Optional, but matches CI:
pnpm test:e2e
```

All must exit 0. If you touched the schema, also run:

```bash
DATABASE_URL='file:./prisma/test.db' pnpm prisma migrate deploy
```

…otherwise integration tests will fail with `column X does not exist` against the stale test DB.

## Coding rules

These rules are enforced by biome + tsc + the test suite. Violating them turns the build red.

### TypeScript

1. **No `any` in production code without a justification comment.** Biome treats `any` as a warning by default; we treat it as an error in `src/`. The few legitimate uses (untyped third-party schemas like tldraw v3 store records, non-standard DOM APIs like `caretRangeFromPoint`) carry an inline `// biome-ignore lint/suspicious/noExplicitAny: <reason>` comment with the reason.
2. **Discriminated unions over string-typed `kind` fields.** `kind: 'rectangle' | string` collapses with sibling variants and breaks narrowing. Use `kind: 'arrow'` / `kind: 'geo'` / etc. as literal tags and put the open-ended detail in a separate field (e.g. `geo: 'rectangle' | 'ellipse' | string`).
3. **Path alias `@/*` maps to `./src/*`.** Configured in `tsconfig.json` and matched by Vitest. Use it for cross-folder imports; don't reach across with `../../../`.

### Biome

1. **`pnpm exec biome check .` is the source of truth for lint + format.** Don't run prettier, eslint, or anything else on `src/` — they will fight biome.
2. **Run `pnpm exec biome check --write .` before commit** if your editor doesn't auto-format on save. The CI step is `check`, not `check --write`, so unformatted code fails the build.
3. **`a11y/useSemanticElements` is a hard error.** Custom-styled chip / pill selectors that use `role="radio"` on a `<button>` need an inline `// biome-ignore lint/a11y/useSemanticElements:` directive on the JSX element line, with a one-line reason.

### Next.js 16

1. **Folders prefixed with `_` are private** and excluded from routing. The `/m/[mockupId]/[...path]/route.ts` serve route was originally under `/_mockups/` and silently 404'd in production. Don't reintroduce the `_` prefix on a folder that contains a `route.ts` or `page.tsx`.
2. **Routes that read mutable state declare `export const dynamic = 'force-dynamic'`** at the bottom of the file. Default for App Router is "static if possible", which caches GETs that depend on cookies/headers/DB rows.
3. **`next.config.ts` sets `output: 'standalone'`** for the Docker build. Don't change it without coordinating a Dockerfile change.

### Prisma

1. **Migrations are generated, never hand-written.** Run `pnpm prisma migrate dev --name <description>`; commit both the SQL file under `prisma/migrations/` and the schema change.
2. **Apply migrations to `prisma/test.db`** in the same change-set: `DATABASE_URL='file:./prisma/test.db' pnpm prisma migrate deploy`. The shared test DB is bootstrapped once when missing (see `tests/setup.ts`); subsequent migrations need an explicit deploy.
3. **Never commit `prisma/dev.db` or `prisma/test.db`.** Both are gitignored. The migrations are the source of truth.

### Vitest

1. **Integration tests share `prisma/test.db`.** `vitest.config.ts` sets `fileParallelism: false, maxWorkers: 1`. Don't change this without solving DB isolation per file (see [Testing](testing.md)).
2. **Each integration test resets DB tables in `beforeEach`** — `await prisma.message.deleteMany()`, etc. Test pollution from prior runs is the most common cause of flaky integration tests.
3. **Inline helpers per test file** — there is no shared `tests/helpers.ts`. Follow the pattern in `tests/integration/api/coverage-gaps.test.ts`: an `adminCookie()` helper at the top, a `fixture()` resolver, and inline `FormData` builders per `it`.

### Agent-loop endpoints

1. **Auth via `identify(req)`** — accepts cookie OR Bearer; returns `{kind: 'user', userId} | {kind: 'agent', tokenId}` or `null`. Never re-implement auth in a route.
2. **Sidecar files are atomic-write candidates.** Writes to `intent.json` and `region.png` go directly to disk; if a future change needs concurrency safety, write to `*.tmp` and rename.
3. **Cache invalidation runs BEFORE the new write.** `updateAnnotationTldraw` deletes `intent.json` before writing the new `tldraw.json` so a concurrent reader never sees a fresh `tldraw.json` paired with a stale `intent.json`.
4. **The `/context` aggregator delegates to `/intent`** by importing the GET handler directly — no HTTP loopback. This keeps tests deterministic and avoids depending on `APP_URL` being reachable from the server.

## Dependency policy

- **`pnpm` is the only package manager.** `package.json` declares `"packageManager": "pnpm@…"`; npm and yarn lockfiles are rejected.
- **Production deps require justification.** New deps land with a one-line note in the commit message explaining the surface they unlock (e.g. "puppeteer for server-side DOM resolution"). Devil-deps (formatters, type stubs) don't need this.
- **Lockfile freshness:** any `package.json` edit requires `pnpm install` and committing both files together.

## Build artefacts and environment

- **`.env.local`** holds dev-mode env vars. Required: `AUTH_SECRET` (≥32 chars), `DATA_DIR`. The schema lives in `src/lib/env.ts`.
- **`prisma/dev.db`** is the default DB when `DATABASE_URL` is unset. `prisma/test.db` is the test target; `tests/setup.ts` sets `DATABASE_URL` for vitest.
- **`{DATA_DIR}/`** holds mockup uploads, version builds, annotation screenshots/tldraw/sidecars. Never commit anything from there.
