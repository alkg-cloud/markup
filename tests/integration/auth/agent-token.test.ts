import { beforeEach, describe, expect, it } from 'vitest';
import { generateAgentToken, hashAgentSecret, verifyAgentToken } from '@/lib/auth/agent-token';
import { prisma } from '@/lib/prisma';

describe('agent token service', () => {
  beforeEach(async () => {
    await prisma.agentToken.deleteMany();
  });

  it('creates a token whose plaintext verifies and lookalikes do not', async () => {
    const created = await generateAgentToken('primary-agent');
    expect(created.plaintext).toMatch(/^mk_(?:live_|test_)[0-9a-f]{64}$/);
    const ok = await verifyAgentToken(created.plaintext);
    expect(ok?.name).toBe('primary-agent');
    expect(await verifyAgentToken(`mk_test_${'a'.repeat(64)}`)).toBeNull();
    expect(await verifyAgentToken('not-a-token')).toBeNull();
  });

  it('hashes deterministically', () => {
    const a = hashAgentSecret('hello');
    const b = hashAgentSecret('hello');
    expect(a).toBe(b);
    expect(a).not.toBe(hashAgentSecret('world'));
  });
});
