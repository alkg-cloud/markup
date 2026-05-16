import { describe, expect, it } from 'vitest';
import { DELETE as deleteToken } from '@/app/api/agent-tokens/[id]/route';
import { POST as createToken, GET as listTokens } from '@/app/api/agent-tokens/route';
import { POST as setup } from '@/app/api/auth/setup/route';
import { prisma } from '@/lib/prisma';

async function adminCookie() {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.config.deleteMany();
  await prisma.agentToken.deleteMany();
  const r = await setup(
    new Request('http://l', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@x.com', password: 'longpassword12345', name: 'A' }),
    }),
  );
  return r.headers.get('set-cookie')!.match(/mk_session=([^;]+)/)![1];
}

describe('agent tokens API', () => {
  it('CRUD happy-path', async () => {
    const cookie = await adminCookie();
    const headers = { 'content-type': 'application/json', cookie: `mk_session=${cookie}` };

    const created = await createToken(
      new Request('http://l', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'primary-agent' }),
      }),
    );
    expect(created.status).toBe(201);
    const cb = await created.json();
    expect(cb.plaintext).toMatch(/^mk_(?:live_|test_)[0-9a-f]{64}$/);

    const listed = await listTokens(new Request('http://l', { headers }));
    const tokens = (await listed.json()).tokens;
    expect(tokens).toHaveLength(1);
    expect(tokens[0].name).toBe('primary-agent');
    expect(tokens[0].plaintext).toBeUndefined();

    const del = await deleteToken(new Request('http://l', { method: 'DELETE', headers }), {
      params: Promise.resolve({ id: cb.id }),
    });
    expect(del.status).toBe(200);
    expect(await prisma.agentToken.count()).toBe(0);
  });

  it('rejects unauthenticated', async () => {
    const r = await listTokens(new Request('http://l'));
    expect(r.status).toBe(401);
  });
});
