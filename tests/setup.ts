import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import { loginLimiter, setupLimiter } from '../src/lib/rate-limit';

const TEST_ROOT = path.resolve(process.cwd(), 'test-data');
const SHARED_TEST_DB = path.resolve(process.cwd(), 'prisma/test.db');

// Set env vars at module load — top-level expressions in API route modules
// (e.g. `createFsProbe({ dir: env().DATA_DIR })`) run during import, which
// happens before vitest's beforeEach. DATABASE_URL must also be set before
// `src/lib/prisma.ts` constructs its singleton.
//
// Phase 2's auth/session tests will likely need a per-test DB strategy; that
// will require resetting the prisma singleton per test, which we'll tackle
// then. For now, the healthcheck's `SELECT 1` is read-only and a shared
// test.db is sufficient.
fs.mkdirSync(TEST_ROOT, { recursive: true });
process.env.DATA_DIR ??= TEST_ROOT;
process.env.AUTH_SECRET ??= 'test-secret-do-not-use-in-prod-must-be-32+chars-long';
(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.DATABASE_URL ??= `file:${SHARED_TEST_DB}`;

if (!fs.existsSync(SHARED_TEST_DB)) {
  // Bootstrap a migrated test DB on first run / fresh checkout.
  execFileSync('pnpm', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: `file:${SHARED_TEST_DB}` },
  });
}

beforeEach(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  fs.mkdirSync(TEST_ROOT, { recursive: true });
  process.env.DATA_DIR = TEST_ROOT;
  process.env.AUTH_SECRET = 'test-secret-do-not-use-in-prod-must-be-32+chars-long';
  (process.env as Record<string, string>).NODE_ENV = 'test';
  // The setup / login rate limiters are module-level token buckets. Across
  // a full test run dozens of tests call `setup` from the `unknown` IP,
  // which would drain the bucket. Reset the well-known keys per test.
  loginLimiter.reset('login:unknown');
  setupLimiter.reset('setup:unknown');
});

afterEach(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
});
