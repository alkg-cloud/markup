import 'server-only';

import crypto from 'node:crypto';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

const PREFIX_LIVE = 'mk_live_';
const PREFIX_TEST = 'mk_test_';
const TOKEN_RE = /^mk_(?:live_|test_)?[0-9a-f]{64}$/;

function getPrefix(): string {
  return process.env.NODE_ENV === 'production' ? PREFIX_LIVE : PREFIX_TEST;
}

export function hashAgentSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export async function generateAgentToken(name: string) {
  const secret = crypto.randomBytes(32).toString('hex');
  const prefix = getPrefix();
  const plaintext = `${prefix}${secret}`;
  const lastFour = secret.slice(-4);
  const tokenHash = hashAgentSecret(plaintext);
  const row = await prisma.agentToken.create({ data: { name, tokenHash, prefix, lastFour } });
  return { plaintext, prefix, lastFour, id: row.id, name: row.name };
}

export async function importAgentToken(name: string, plaintextSecret: string) {
  const prefix = getPrefix();
  const plaintext = `${prefix}${plaintextSecret}`;
  const lastFour = plaintextSecret.slice(-4);
  const tokenHash = hashAgentSecret(plaintext);
  return prisma.agentToken.create({ data: { name, tokenHash, prefix, lastFour } });
}

export async function verifyAgentToken(presented: string) {
  if (!TOKEN_RE.test(presented)) return null;
  const presentedHash = hashAgentSecret(presented);
  // `tokenHash` is `@unique` in the schema and is itself the SHA-256 of the
  // secret — looking it up directly is O(1) and does not leak timing info
  // (the hash IS the comparison material; the attacker would need to invert
  // SHA-256 to learn anything from a timing oracle).
  const row = await prisma.agentToken.findUnique({ where: { tokenHash: presentedHash } });
  if (!row) return null;
  // Fire-and-forget `lastUsedAt` update; don't block the request on it.
  prisma.agentToken
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch((err) => logger.warn({ event: 'agent_token_lastused_update_failed', err }, 'lastUsed'));
  logger.info({ event: 'agent_token_used', tokenId: row.id, name: row.name }, 'agent auth');
  return { id: row.id, name: row.name };
}
