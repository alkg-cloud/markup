import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/lib/env';

describe('loadEnv', () => {
  it('rejects when AUTH_SECRET is shorter than 32 characters', () => {
    expect(() => loadEnv({ AUTH_SECRET: 'short', DATA_DIR: '/tmp' })).toThrow(/AUTH_SECRET/);
  });

  it('parses defaults when only required vars are set', () => {
    const env = loadEnv({
      AUTH_SECRET: 'a'.repeat(32),
      DATA_DIR: '/tmp/data',
    });
    expect(env.MAX_UPLOAD_MB).toBe(50);
    expect(env.MAX_FILES_PER_UPLOAD).toBe(1000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.PUID).toBe(1000);
    expect(env.AGENT_TOKENS).toEqual([]);
  });

  it('parses AGENT_TOKENS into structured pairs', () => {
    const env = loadEnv({
      AUTH_SECRET: 'a'.repeat(32),
      DATA_DIR: '/tmp/data',
      AGENT_TOKENS: 'primary-agent:abc123,backup-agent:def456',
    });
    expect(env.AGENT_TOKENS).toEqual([
      { name: 'primary-agent', secret: 'abc123' },
      { name: 'backup-agent', secret: 'def456' },
    ]);
  });

  it('rejects invalid AGENT_TOKENS name charset', () => {
    expect(() =>
      loadEnv({
        AUTH_SECRET: 'a'.repeat(32),
        DATA_DIR: '/tmp/data',
        AGENT_TOKENS: 'bad name:secret',
      }),
    ).toThrow(/agent token name/i);
  });
});
