import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach } from 'vitest';

const TEST_ROOT = path.resolve(process.cwd(), 'test-data');

beforeEach(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  fs.mkdirSync(TEST_ROOT, { recursive: true });
  process.env.DATA_DIR = TEST_ROOT;
  process.env.AUTH_SECRET = 'test-secret-do-not-use-in-prod-must-be-32+chars-long';
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
});
