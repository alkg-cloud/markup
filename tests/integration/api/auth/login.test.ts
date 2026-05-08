import { beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { GET as me } from '@/app/api/auth/me/route';
import { POST as setup } from '@/app/api/auth/setup/route';
import { prisma } from '@/lib/prisma';

const PWD = 'hunter22-very-long-pass';

async function bootstrapAdmin() {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.config.deleteMany();
  await setup(
    new Request('http://l/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@x.com', password: PWD, name: 'A' }),
    }),
  );
}

describe('login/logout/me', () => {
  beforeEach(async () => bootstrapAdmin());

  it('happy-path: login → me → logout → me unauthenticated', async () => {
    const lr = await login(
      new Request('http://l/x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'admin@x.com', password: PWD }),
      }),
    );
    expect(lr.status).toBe(200);
    const cookie = lr.headers.get('set-cookie')!;
    const sessVal = cookie.match(/mk_session=([^;]+)/)![1];

    const meRes = await me(
      new Request('http://l/x', {
        headers: { cookie: `mk_session=${sessVal}` },
      }),
    );
    expect((await meRes.json()).kind).toBe('user');

    const lo = await logout(
      new Request('http://l/x', {
        method: 'POST',
        headers: { cookie: `mk_session=${sessVal}` },
      }),
    );
    expect(lo.status).toBe(200);

    const me2 = await me(
      new Request('http://l/x', {
        headers: { cookie: `mk_session=${sessVal}` },
      }),
    );
    expect(me2.status).toBe(401);
  });

  it('rejects wrong password', async () => {
    const r = await login(
      new Request('http://l/x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'admin@x.com', password: 'wrong' }),
      }),
    );
    expect(r.status).toBe(401);
  });
});
