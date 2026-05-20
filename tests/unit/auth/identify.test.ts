import { describe, expect, it, vi } from 'vitest';

import { identify, requireAdmin } from '@/lib/auth/identify';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(async (t: string) => (t === 'good' ? { sessionId: 's', userId: 'u' } : null)),
  SESSION_COOKIE: 'mk_session',
}));
vi.mock('@/lib/auth/agent-token', () => ({
  verifyAgentToken: vi.fn(async (t: string) =>
    t === 'mk_xxx' ? { id: 'a', name: 'primary-agent' } : null,
  ),
}));

// Mock prisma for the unit test — no DB needed; we control what user.findUnique returns.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === 'admin-id') return { role: 'admin' };
        if (where.id === 'member-id') return { role: 'member' };
        return null;
      }),
    },
  },
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

describe('requireAdmin', () => {
  it('throws 401 for null identity', async () => {
    await expect(requireAdmin(null)).rejects.toMatchObject({
      message: 'unauthorized',
      status: 401,
    });
  });
  it('throws 403 forbidden_kind for agent identity', async () => {
    await expect(
      requireAdmin({ kind: 'agent', tokenId: 't', name: 'agent-1' }),
    ).rejects.toMatchObject({ message: 'forbidden_kind', status: 403 });
  });
  it('throws 403 forbidden_role for non-admin user', async () => {
    await expect(
      requireAdmin({ kind: 'user', userId: 'member-id', sessionId: 's' }),
    ).rejects.toMatchObject({ message: 'forbidden_role', status: 403 });
  });
  it('returns the identity for admin user', async () => {
    const id = await requireAdmin({ kind: 'user', userId: 'admin-id', sessionId: 's' });
    expect(id).toEqual({ kind: 'user', userId: 'admin-id', sessionId: 's' });
  });
  it('throws 403 forbidden_role for an unknown user id', async () => {
    await expect(
      requireAdmin({ kind: 'user', userId: 'ghost', sessionId: 's' }),
    ).rejects.toMatchObject({ message: 'forbidden_role', status: 403 });
  });
});
