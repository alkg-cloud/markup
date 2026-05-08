import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFsProbe } from '@/lib/healthcheck';

describe('createFsProbe', () => {
  it('returns healthy on first call and caches for window ms', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mk-fs-'));
    let calls = 0;
    const probe = createFsProbe({
      dir,
      windowMs: 60_000,
      now: () => 0,
      check: async () => {
        calls += 1;
        return true;
      },
    });
    expect(await probe()).toBe(true);
    expect(await probe()).toBe(true);
    expect(calls).toBe(1);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('refreshes after the window expires', async () => {
    let calls = 0;
    let now = 0;
    const probe = createFsProbe({
      dir: '/tmp',
      windowMs: 60_000,
      now: () => now,
      check: async () => {
        calls += 1;
        return true;
      },
    });
    await probe();
    now = 60_001;
    await probe();
    expect(calls).toBe(2);
  });

  it('returns false when underlying check throws', async () => {
    const probe = createFsProbe({
      dir: '/tmp',
      windowMs: 60_000,
      now: () => 0,
      check: async () => {
        throw new Error('disk full');
      },
    });
    expect(await probe()).toBe(false);
  });
});
