import { beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/auth/setup/route';
import { prisma } from '@/lib/prisma';
import { setupLimiter } from '@/lib/rate-limit';

function reqJson(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/auth/setup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/setup', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.config.deleteMany();
    // Reset rate limiter per test so the 5-attempt bucket starts full.
    setupLimiter.reset('setup:unknown');
    setupLimiter.reset('setup:1.2.3.4');
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

  it('rate-limits after 5 attempts per minute per IP', async () => {
    const ip = '1.2.3.4';
    // 5 successful (or normally-handled) attempts; subsequent gets a 429.
    for (let i = 0; i < 5; i++) {
      const r = await POST(
        reqJson({ email: `a${i}@x.com`, password: 'longpassword123', name: `A${i}` }, {
          'x-forwarded-for': ip,
        }),
      );
      // First call creates the admin; subsequent should be 403 (setup
      // already completed) — both consume a bucket token.
      expect([200, 403]).toContain(r.status);
    }
    const sixth = await POST(
      reqJson({ email: 'z@x.com', password: 'longpassword123', name: 'Z' }, {
        'x-forwarded-for': ip,
      }),
    );
    expect(sixth.status).toBe(429);
    const body = await sixth.json();
    expect(body.error).toBe('rate_limited');
  });
});
