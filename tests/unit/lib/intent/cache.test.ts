import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  deleteIntentCache,
  intentSidecarPath,
  readIntentCache,
  writeIntentCache,
} from '@/lib/intent/cache';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'intent-cache-'));
}

describe('intent cache', () => {
  it('returns null when sidecar absent', () => {
    expect(readIntentCache(tmpDir(), 'k1')).toBeNull();
  });

  it('round-trips JSON payload', () => {
    const d = tmpDir();
    writeIntentCache(d, 'k1', { foo: 'bar' });
    const got = readIntentCache(d, 'k1');
    expect(got).toEqual({ key: 'k1', payload: { foo: 'bar' } });
  });

  it('returns null when key mismatches', () => {
    const d = tmpDir();
    writeIntentCache(d, 'k1', { foo: 'bar' });
    expect(readIntentCache(d, 'k-other')).toBeNull();
  });

  it('deletes sidecar', () => {
    const d = tmpDir();
    writeIntentCache(d, 'k1', { foo: 'bar' });
    expect(fs.existsSync(intentSidecarPath(d))).toBe(true);
    deleteIntentCache(d);
    expect(fs.existsSync(intentSidecarPath(d))).toBe(false);
  });

  it('deleteIntentCache is a no-op when sidecar absent', () => {
    expect(() => deleteIntentCache(tmpDir())).not.toThrow();
  });

  it('returns null on malformed JSON', () => {
    const d = tmpDir();
    fs.writeFileSync(intentSidecarPath(d), 'not json');
    expect(readIntentCache(d, 'k1')).toBeNull();
  });
});
