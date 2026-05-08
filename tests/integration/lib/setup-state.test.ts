import { beforeEach, describe, expect, it } from 'vitest';
import { isSetupCompleted, markSetupCompleted } from '@/lib/auth/setup-state';
import { prisma } from '@/lib/prisma';

describe('setup state', () => {
  beforeEach(async () => {
    await prisma.config.deleteMany();
  });

  it('reports false until marked', async () => {
    expect(await isSetupCompleted()).toBe(false);
    await markSetupCompleted();
    expect(await isSetupCompleted()).toBe(true);
  });
});
