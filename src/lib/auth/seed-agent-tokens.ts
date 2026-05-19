import 'server-only';

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { hashAgentSecret } from './agent-token';

export async function seedAgentTokens(pairs: { name: string; secret: string }[]) {
  for (const { name, secret } of pairs) {
    const existing = await prisma.agentToken.findUnique({ where: { name } });
    if (existing) {
      logger.info({ name }, 'agent_token_seed_skipped_existing');
      continue;
    }
    await prisma.agentToken.create({
      data: { name, tokenHash: hashAgentSecret(`mk_${secret}`) },
    });
    logger.info({ name }, 'agent_token_seeded');
  }
}
