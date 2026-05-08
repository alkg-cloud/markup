import { beforeEach, describe, expect, it } from 'vitest';
import { seedAgentTokens } from '@/lib/auth/seed-agent-tokens';
import { prisma } from '@/lib/prisma';

describe('seedAgentTokens', () => {
  beforeEach(async () => {
    await prisma.agentToken.deleteMany();
  });

  it('creates tokens that do not exist; skips existing names', async () => {
    await seedAgentTokens([{ name: 'paperclip', secret: 'first' }]);
    expect(await prisma.agentToken.count()).toBe(1);

    await seedAgentTokens([
      { name: 'paperclip', secret: 'changed' },
      { name: 'backup-agent', secret: 'second' },
    ]);
    expect(await prisma.agentToken.count()).toBe(2);
    const pc = await prisma.agentToken.findUnique({ where: { name: 'paperclip' } });
    const { hashAgentSecret } = await import('@/lib/auth/agent-token');
    expect(pc!.tokenHash).toBe(hashAgentSecret('mk_first'));
  });
});
