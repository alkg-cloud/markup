import { describe, expect, it, vi } from 'vitest';

import { identify } from '@/lib/auth/identify';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(async (t: string) => (t === 'good' ? { sessionId: 's', userId: 'u' } : null)),
  SESSION_COOKIE: 'mk_session',
}));
vi.mock('@/lib/auth/agent-token', () => ({
  verifyAgentToken: vi.fn(async (t: string) =>
    t === 'mk_xxx' ? { id: 'a', name: 'primary-agent' } : null,
  ),
}));

interface FakeRequest {
  headers: {
    get: (k: string) => string | null;
  };
  cookies: {
    get: (k: string) => { value: string } | undefined;
  };
}

function fakeReq(
  headers: Record<string, string>,
  cookies: Record<string, string> = {},
): FakeRequest {
  return {
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    cookies: { get: (k: string) => (cookies[k] ? { value: cookies[k] } : undefined) },
  };
}

describe('identify', () => {
  it('returns user identity from session cookie', async () => {
    const id = await identify(fakeReq({}, { mk_session: 'good' }) as unknown as Request);
    expect(id).toEqual({ kind: 'user', userId: 'u', sessionId: 's' });
  });

  it('returns agent identity from bearer token', async () => {
    const id = await identify(fakeReq({ authorization: 'Bearer mk_xxx' }) as unknown as Request);
    expect(id).toEqual({ kind: 'agent', tokenId: 'a', name: 'primary-agent' });
  });

  it('returns null when no credentials', async () => {
    const id = await identify(fakeReq({}) as unknown as Request);
    expect(id).toBeNull();
  });

  it('prefers session cookie over bearer when both present', async () => {
    const id = await identify(
      fakeReq({ authorization: 'Bearer mk_xxx' }, { mk_session: 'good' }) as unknown as Request,
    );
    expect(id?.kind).toBe('user');
  });
});
