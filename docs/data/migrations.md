# Migrations

Prisma owns the migration tooling. Every schema change ships as a generated SQL file under `prisma/migrations/<timestamp>_<name>/migration.sql`.

## Adding a column

```bash
# 1. Edit prisma/schema.prisma
# 2. Generate the migration interactively
pnpm prisma migrate dev --name add_<thing>
# 3. Apply to the test DB so vitest picks it up
DATABASE_URL='file:./prisma/test.db' pnpm prisma migrate deploy
# 4. Update docs/data/schema.md with the new field
```

`prisma migrate dev` does three things:

1. Generates the SQL under `prisma/migrations/`
2. Applies it to `prisma/dev.db`
3. Regenerates the Prisma client (so editor types update)

If the dev server is running, `migrate dev` will fail with `database is locked`. Stop it first:

```bash
pkill -f 'next dev'
pnpm prisma migrate dev --name …
pnpm dev
```

## Adding a non-null column with a default

For columns that must be non-null on every row, set a `@default(...)` in the schema. Prisma generates the column with `NOT NULL DEFAULT '<value>'` and existing rows pick up the default automatically:

```prisma
status String @default("open")
```

This is the simplest case and needs no extra backfill.

## Adding a column that needs a derived backfill

Sometimes a new column's value depends on another row. Example: `Annotation.createdOnVersionId` should equal the mockup's current version at migration time.

Make the column nullable in the schema:

```prisma
createdOnVersionId String?
createdOnVersion   MockupVersion? @relation("CreatedOnVersion", fields: [createdOnVersionId], references: [id])
```

Generate the migration, then **append** a backfill `UPDATE` to the generated `migration.sql`:

```sql
-- (after the ALTER TABLE / RedefineTables block)
UPDATE Annotation
SET createdOnVersionId = (
  SELECT m.currentVersionId FROM Mockup m WHERE m.id = Annotation.mockupId
)
WHERE createdOnVersionId IS NULL;
```

Re-run `pnpm prisma migrate dev` (or `prisma migrate deploy` if the migration is already applied to the dev DB but not to the production database).

The backfill is idempotent — it only updates rows where the column is still `NULL`.

## Renaming a column

Prisma SQLite migrations don't support an in-place rename. The migration generator emits a "redefine table" sequence:

```sql
CREATE TABLE "new_X" ( … with the new column name … );
INSERT INTO "new_X" (…) SELECT … FROM "X";
DROP TABLE "X";
ALTER TABLE "new_X" RENAME TO "X";
```

This is fine for local development. For a production database with significant data, prefer a two-phase rollout:

1. **Add the new column**, copy data into it, deploy code that writes both
2. After the deploy is stable, **drop the old column** in a second migration

The two-phase approach is documented here for completeness; the project's current deployments are small enough that the redefine-table approach is acceptable.

## Test database

Vitest runs against `prisma/test.db`. `tests/setup.ts` creates it via `prisma migrate deploy` on first run only — once the file exists, subsequent migrations need an explicit deploy:

```bash
DATABASE_URL='file:./prisma/test.db' pnpm prisma migrate deploy
```

Forgetting this is the most common cause of "column X does not exist" test failures after a schema change. Add it to your migration commit's local-verify checklist.

## Production database

In a Docker deployment, `${DATA_DIR}` holds the SQLite file. The container entrypoint runs `prisma migrate deploy` at boot, so the running container always sees the latest schema.

For a backup-restore workflow, restore the DB file first, then start the container — the entrypoint will idempotently apply any migrations newer than the backup.

## Inspecting state

```bash
sqlite3 prisma/dev.db ".schema <Table>"
sqlite3 prisma/dev.db "SELECT … FROM <Table> LIMIT 5"
sqlite3 prisma/dev.db "PRAGMA table_info(<Table>)"
```

To see which migrations have been applied:

```bash
sqlite3 prisma/dev.db "SELECT migration_name FROM _prisma_migrations ORDER BY started_at"
```

## Reset

```bash
# Wipe + reseed dev DB (drops all data!)
rm prisma/dev.db
pnpm prisma migrate deploy

# Wipe + reseed test DB
rm prisma/test.db
DATABASE_URL='file:./prisma/test.db' pnpm prisma migrate deploy
```

Both files are gitignored — never commit them.

## Don't write SQL by hand outside migrations

Application code uses the Prisma client, never raw SQL via `$queryRaw`. The exceptions:

- Migration files (this is where raw SQL belongs)
- One-shot scripts under `scripts/` that need a migration-adjacent operation — a file-only cleanup that doesn't touch the DB, or a backfill that uses `$executeRaw` when a Prisma upsert isn't expressive enough. These scripts are deleted once they have run in every environment; the migration history in `prisma/migrations/` is what persists.

If you find yourself reaching for `$queryRaw` in a service or route, the right move is usually to express the query through Prisma's relational operators or to add a small index to make the natural query fast.
