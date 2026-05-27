import { beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/auth/setup/route';
import { GET } from '@/app/api/auth/setup-status/route';
import { prisma } from '@/lib/prisma';
import { setupLimiter } from '@/lib/rate-limit';

function setupReq(body: unknown) {
  return new Request('http://localhost/api/auth/setup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/auth/setup-status', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.config.deleteMany();
    setupLimiter.reset('setup:unknown');
  });

  it('returns { completed: false } when no user exists', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ completed: false });
  });

  it('returns { completed: true } after setup has been completed', async () => {
    await POST(
      setupReq({ email: 'admin@example.com', password: 'hunter22-very-long-pass', name: 'Admin' }),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ completed: true });
  });

  it('is public — does not require an auth cookie', async () => {
    // No cookie or Authorization header is passed. The route must still respond.
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('completed');
  });
});
