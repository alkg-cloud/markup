import { beforeEach, describe, expect, it } from 'vitest';
import { hashPassword } from '@/lib/auth/password';
import { prisma } from '@/lib/prisma';

async function freshState() {
  await prisma.invite.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.config.deleteMany();
}

beforeEach(freshState);

describe('Invite schema invariants', () => {
  it('partial-unique on usedById prevents linking two invites to one user', async () => {
    const admin = await prisma.user.create({
      data: {
        email: 'adminschema@x.com',
        name: 'Admin',
        passwordHash: await hashPassword('longpassword12345'),
        role: 'admin',
      },
    });
    const minted = await prisma.user.create({
      data: {
        email: 'mintedschema@x.com',
        name: 'Minted',
        passwordHash: await hashPassword('longpassword12345'),
        role: 'member',
      },
    });
    await prisma.invite.create({
      data: {
        tokenHash: 'h1-schema-test',
        prefix: 'mki_test_',
        lastFour: 'x001',
        role: 'member',
        createdById: admin.id,
        status: 'used',
        usedAt: new Date(),
        usedById: minted.id,
      },
    });
    // A second invite pointing at the same usedById should be rejected.
    await expect(
      prisma.invite.create({
        data: {
          tokenHash: 'h2-schema-test',
          prefix: 'mki_test_',
          lastFour: 'x002',
          role: 'member',
          createdById: admin.id,
          status: 'used',
          usedAt: new Date(),
          usedById: minted.id,
        },
      }),
    ).rejects.toThrow(/unique/i);
  });
});
