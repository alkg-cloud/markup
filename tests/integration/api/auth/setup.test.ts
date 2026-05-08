import { beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/auth/setup/route';
import { prisma } from '@/lib/prisma';

function reqJson(body: unknown) {
  return new Request('http://localhost/api/auth/setup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/setup', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.config.deleteMany();
  });

  it('creates an admin and marks setup complete on first call', async () => {
    const res = await POST(
      reqJson({
        email: 'admin@example.com',
        password: 'hunter22-very-long-pass',
        name: 'Admin',
      }),
    );
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie');
    expect(cookie).toContain('mk_session=');
    expect(await prisma.user.count()).toBe(1);
    const cfg = await prisma.config.findUnique({ where: { key: 'setup_completed' } });
    expect(cfg?.value).toBe('true');
  });

  it('refuses second call', async () => {
    await POST(reqJson({ email: 'a@x.com', password: 'longpassword123', name: 'A' }));
    const res = await POST(reqJson({ email: 'b@x.com', password: 'longpassword123', name: 'B' }));
    expect(res.status).toBe(403);
  });

  it('rejects short password', async () => {
    const res = await POST(reqJson({ email: 'a@x.com', password: 'short', name: 'A' }));
    expect(res.status).toBe(400);
  });
});
