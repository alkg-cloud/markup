import crypto from 'node:crypto';
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
  const candidates = await prisma.agentToken.findMany();
  const presentedBuf = Buffer.from(presentedHash, 'hex');
  for (const row of candidates) {
    const stored = Buffer.from(row.tokenHash, 'hex');
    if (stored.length !== presentedBuf.length) continue;
    if (crypto.timingSafeEqual(stored, presentedBuf)) {
      await prisma.agentToken.update({
        where: { id: row.id },
        data: { lastUsedAt: new Date() },
      });
      return { id: row.id, name: row.name };
    }
  }
  return null;
}
