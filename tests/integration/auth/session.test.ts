import { beforeEach, describe, expect, it } from 'vitest';
import { hashPassword } from '@/lib/auth/password';
import { createSession, getSession, invalidateSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

async function makeUser() {
  return prisma.user.create({
    data: {
      email: `u-${Date.now()}-${Math.random()}@example.com`,
      name: 'Admin',
      passwordHash: await hashPassword('hunter2'),
    },
  });
}

describe('session service', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('creates, fetches, and invalidates a session', async () => {
    const user = await makeUser();
    const { token, session } = await createSession(user.id);
    const fetched = await getSession(token);
    expect(fetched?.userId).toBe(user.id);
    await invalidateSession(session.id);
    expect(await getSession(token)).toBeNull();
  });

  it('returns null for an unknown session', async () => {
    expect(await getSession('garbage')).toBeNull();
  });
});
