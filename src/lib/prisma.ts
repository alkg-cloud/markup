import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPragmasApplied?: boolean;
};

function makeClient(): PrismaClient {
  // Prisma 7 requires a driver adapter; the `datasource` block in
  // `schema.prisma` no longer carries a runtime URL. We resolve the URL the
  // same way `prisma.config.ts` does so CLI and runtime stay in sync.
  const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
  const filePath = url.startsWith('file:') ? url.slice('file:'.length) : url;
  const adapter = new PrismaBetterSqlite3({ url: filePath });
  return new PrismaClient({ adapter });
}

async function applyPragmas(client: PrismaClient): Promise<void> {
  // SQLite pragmas configure per-connection behaviour, but the better-sqlite3
  // adapter holds a single long-lived connection so a one-time apply is
  // sufficient. WAL is durable across opens (it's persisted to the DB file
  // header), so subsequent processes inherit it; we still re-assert on each
  // boot to guard against a future mode change.
  // - journal_mode=WAL: safe concurrent reads and atomic snapshot backups.
  // - synchronous=NORMAL: WAL-recommended balance of durability and speed.
  // - foreign_keys=ON: SQLite defaults this OFF; we want referential integrity.
  await client.$queryRawUnsafe('PRAGMA journal_mode = WAL');
  await client.$queryRawUnsafe('PRAGMA synchronous = NORMAL');
  await client.$queryRawUnsafe('PRAGMA foreign_keys = ON');
}

const prismaClient = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient;

// Top-level await: blocks the module's export until pragmas finish, so any
// import of `prisma` is guaranteed to see WAL mode. Guarded across hot reloads
// in dev and test re-imports so we apply the three statements at most once
// per process.
if (!globalForPrisma.prismaPragmasApplied) {
  await applyPragmas(prismaClient);
  globalForPrisma.prismaPragmasApplied = true;
}

export const prisma = prismaClient;
