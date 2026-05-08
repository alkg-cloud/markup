import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient(): PrismaClient {
  // Prisma 7 requires a driver adapter; the `datasource` block in
  // `schema.prisma` no longer carries a runtime URL. We resolve the URL the
  // same way `prisma.config.ts` does so CLI and runtime stay in sync.
  const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
  const filePath = url.startsWith('file:') ? url.slice('file:'.length) : url;
  const adapter = new PrismaBetterSqlite3({ url: filePath });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
