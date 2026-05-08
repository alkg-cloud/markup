import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { isSetupCompleted, markSetupCompleted } from '@/lib/auth/setup-state';

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
