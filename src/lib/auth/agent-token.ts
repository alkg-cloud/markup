import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

const PREFIX = 'mk_';
const TOKEN_RE = /^mk_[0-9a-f]{64}$/;

export function hashAgentSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export async function generateAgentToken(name: string) {
  const secret = crypto.randomBytes(32).toString('hex');
  const plaintext = `${PREFIX}${secret}`;
  const tokenHash = hashAgentSecret(plaintext);
  const row = await prisma.agentToken.create({ data: { name, tokenHash } });
  return { plaintext, id: row.id, name: row.name };
}

export async function importAgentToken(name: string, plaintextSecret: string) {
  const plaintext = `${PREFIX}${plaintextSecret}`;
  const tokenHash = hashAgentSecret(plaintext);
  return prisma.agentToken.create({ data: { name, tokenHash } });
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
