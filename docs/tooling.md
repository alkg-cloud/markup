# Tooling

## Package manager

**`pnpm`** is the only supported package manager. The version is pinned in `package.json` via the `packageManager` field.

```bash
pnpm install                      # install deps + run postinstall hooks
pnpm install --frozen-lockfile    # CI-style; fails on lockfile drift
```

## Scripts (`package.json`)

```bash
pnpm dev                  # next dev -p 3000 (Turbopack)
pnpm build                # next build
pnpm start                # next start (production server)

pnpm test                 # vitest run
pnpm test:watch           # vitest in watch mode
pnpm test:e2e             # Playwright (when present)

pnpm lint                 # biome check .
pnpm format               # biome check --write .

pnpm prisma:generate      # prisma generate (regenerate client after schema edit)
pnpm prisma:migrate       # prisma migrate dev (interactive — names the migration)
pnpm prisma:deploy        # prisma migrate deploy (CI-style — apply pending)

pnpm reset:auth           # wipe admin + sessions; keeps mockups
pnpm reset:tokens         # wipe agent tokens; reseed from AGENT_TOKENS env
pnpm reset:all            # interactive nuke (use --force to skip confirmation)
```

## Prisma workflows

### Adding a column

```bash
# 1. Edit prisma/schema.prisma
# 2. Generate the migration interactively
pnpm prisma migrate dev --name add_<thing>
# 3. Apply to the test DB so vitest picks it up
DATABASE_URL='file:./prisma/test.db' pnpm prisma migrate deploy
# 4. Update docs/data/schema.md
```

If `prisma migrate dev` errors with `database is locked`, stop the dev server first (`pkill -f 'next dev'`).

### Backfilling existing rows

If the new column has existing data that needs a non-null value, append a backfill `UPDATE` to the generated `migration.sql` BEFORE re-running `prisma migrate deploy`. Example pattern:

```sql
-- after the ALTER TABLE block:
UPDATE Annotation
SET createdOnVersionId = (
  SELECT m.currentVersionId FROM Mockup m WHERE m.id = Annotation.mockupId
)
WHERE createdOnVersionId IS NULL;
```

The migration is idempotent because the SQLite `redefine table` template uses `INSERT INTO new_X SELECT … FROM X`. Adding the backfill afterward only runs once per environment.

### Inspecting the DB

```bash
sqlite3 prisma/dev.db ".schema Annotation"
sqlite3 prisma/dev.db "SELECT id, intentType FROM Annotation LIMIT 5"
```

## Biome

Configuration in `biome.json`. Single tool for lint + format.

```bash
pnpm exec biome check .                 # check (CI step)
pnpm exec biome check --write .         # apply autofixes
pnpm exec biome check --max-diagnostics=80 .   # raise the per-run cap when many warnings exist
```

The format and lint phases run together. Auto-fixable warnings (`useTemplate`, `noUnusedImports`, `assist/source/organizeImports`) are silently fixed by `--write`; `noExplicitAny` and `useSemanticElements` need manual attention or an inline biome-ignore comment.

## One-shot scripts (`scripts/`)

`scripts/` holds maintenance scripts run via `tsx`:

```bash
pnpm exec tsx scripts/<name>.ts
```

Existing scripts:

- `strip-existing-annotation-base64.ts` — iterate every annotation's `tldraw.json` on disk and remove duplicated base64 screenshots. One-shot data migration tied to the v1.3 base64-strip rollout.

When writing a new script:

- Read `env()` for `DATA_DIR` (don't hardcode `/tmp/markup-dev-data`)
- Print one summary line per affected file plus a totals line at the end
- Do not import the Prisma client unless the script writes to the DB — file-only scripts run without a Prisma session
- Document the script in this file when it lands

## Environment files

- `.env.local` — gitignored, dev defaults
- `.env.test` — not used; vitest sets env in `tests/setup.ts`
- Production env comes from the Docker `-e` flags (see `README.md`)

Required vars (validated in `src/lib/env.ts`):

| Var | Purpose | Default |
|---|---|---|
| `AUTH_SECRET` | JWT signing (≥ 32 chars) | required |
| `DATA_DIR` | filesystem storage root | required |
| `APP_URL` | public URL (used by puppeteer to reach the serve route) | `http://localhost:3000` |
| `DATABASE_URL` | Prisma connection string | `file:./prisma/dev.db` |
| `LOG_LEVEL` | pino level | `info` |
| `MAX_UPLOAD_MB`, `MAX_FILES_PER_UPLOAD`, `MAX_FILE_SIZE_MB` | upload limits | `50` / `1000` / `10` |
| `AGENT_TOKENS` | seeded boot tokens (`name1:secret1,name2:secret2`) | empty |

Optional:

- `PUID`, `PGID` — Linux UID/GID the container drops to (Docker only)

## Dev server

```bash
pnpm dev    # http://localhost:3000
```

The first hit triggers Next 16's first-visit compile (~300 ms with Turbopack on a small surface). Setup wizard at `/setup` if no admin user exists; `/login` otherwise.

When the dev server can't acquire a SQLite lock (after running `prisma migrate dev` while it's up), kill and restart:

```bash
pkill -f 'next dev'
pnpm dev
```

## Production build

```bash
pnpm build
```

Outputs to `.next/standalone/`. The Dockerfile copies that tree plus the `public/` folder and runs the standalone server with `tini` + `su-exec`.
