import { describe, expect, it } from 'vitest';
import { assertSameOrigin, isSameOrigin } from '@/lib/auth/origin';

function req(headers: Record<string, string>): Request {
  return new Request('http://example.com/api/x', { method: 'POST', headers });
}

describe('isSameOrigin / assertSameOrigin', () => {
  it('accepts request without Origin header (non-browser / curl)', () => {
    expect(isSameOrigin(req({}))).toBe(true);
    expect(assertSameOrigin(req({}))).toBeNull();
  });

  it('accepts same-origin matching APP_URL', () => {
    const r = req({ origin: 'http://localhost:3000' });
    expect(isSameOrigin(r)).toBe(true);
    expect(assertSameOrigin(r)).toBeNull();
  });

  it('rejects cross-origin', () => {
    const r = req({ origin: 'https://evil.example' });
    expect(isSameOrigin(r)).toBe(false);
    const res = assertSameOrigin(r);
    expect(res?.status).toBe(403);
  });

  it('rejects malformed origin', () => {
    const r = req({ origin: 'not-a-url' });
    expect(isSameOrigin(r)).toBe(false);
  });

  it('accepts origins listed in MARKUP_ALLOWED_ORIGINS', () => {
    const prev = process.env.MARKUP_ALLOWED_ORIGINS;
    process.env.MARKUP_ALLOWED_ORIGINS = 'https://tabs-dropped-temporary-tail.trycloudflare.com';
    try {
      const r = req({ origin: 'https://tabs-dropped-temporary-tail.trycloudflare.com' });
      expect(isSameOrigin(r)).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.MARKUP_ALLOWED_ORIGINS;
      else process.env.MARKUP_ALLOWED_ORIGINS = prev;
    }
  });

  it('rejects when MARKUP_ALLOWED_ORIGINS does not include the origin', () => {
    const prev = process.env.MARKUP_ALLOWED_ORIGINS;
    process.env.MARKUP_ALLOWED_ORIGINS = 'https://allowed.example';
    try {
      const r = req({ origin: 'https://evil.example' });
      expect(isSameOrigin(r)).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.MARKUP_ALLOWED_ORIGINS;
      else process.env.MARKUP_ALLOWED_ORIGINS = prev;
    }
  });

  it('auto-allows *.trycloudflare.com / *.ngrok.io / *.ngrok-free.app under NODE_ENV=development', () => {
    // `process.env.NODE_ENV` is typed as readonly under @types/node; cast to a
    // mutable string-bag to flip it for the test, then restore in finally.
    const env = process.env as Record<string, string | undefined>;
    const prev = env.NODE_ENV;
    env.NODE_ENV = 'development';
    try {
      expect(isSameOrigin(req({ origin: 'https://a-b-c.trycloudflare.com' }))).toBe(true);
      expect(isSameOrigin(req({ origin: 'https://foo.ngrok.io' }))).toBe(true);
      expect(isSameOrigin(req({ origin: 'https://foo.ngrok-free.app' }))).toBe(true);
      // Suffix match — random subdomains under the same TLD pass too.
      expect(isSameOrigin(req({ origin: 'https://very.long.host.trycloudflare.com' }))).toBe(true);
      // But unrelated hosts still don't pass just because we're in dev.
      expect(isSameOrigin(req({ origin: 'https://evil.example' }))).toBe(false);
      // And a lookalike that doesn't match the suffix anchor is rejected.
      expect(isSameOrigin(req({ origin: 'https://trycloudflare.com.evil.example' }))).toBe(false);
    } finally {
      if (prev === undefined) delete env.NODE_ENV;
      else env.NODE_ENV = prev;
    }
  });

  it('does NOT auto-allow tunnel suffixes when NODE_ENV=production', () => {
    const env = process.env as Record<string, string | undefined>;
    const prev = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      expect(isSameOrigin(req({ origin: 'https://a-b-c.trycloudflare.com' }))).toBe(false);
    } finally {
      if (prev === undefined) delete env.NODE_ENV;
      else env.NODE_ENV = prev;
    }
  });
});
