import 'server-only';

import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

const PREFIX_LIVE = 'mki_live_';
const PREFIX_TEST = 'mki_test_';
export const TOKEN_RE = /^mki_(?:live_|test_)?[0-9a-f]{64}$/;

function getPrefix(): string {
  return process.env.NODE_ENV === 'production' ? PREFIX_LIVE : PREFIX_TEST;
}

export function hashInviteSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export interface CreateInviteOpts {
  email: string | null;
  role: 'admin' | 'member';
  expiresAt: Date | null;
  createdById: string;
}

export async function generateInvite(opts: CreateInviteOpts) {
  const secret = crypto.randomBytes(32).toString('hex');
  const prefix = getPrefix();
  const plaintext = `${prefix}${secret}`;
  const lastFour = secret.slice(-4);
  const tokenHash = hashInviteSecret(plaintext);
  const row = await prisma.invite.create({
    data: {
      tokenHash,
      prefix,
      lastFour,
      email: opts.email,
      role: opts.role,
      expiresAt: opts.expiresAt,
      createdById: opts.createdById,
    },
  });
  return { ...row, plaintext };
}

export async function findInviteByPresentedToken(presented: string) {
  if (!TOKEN_RE.test(presented)) return null;
  const tokenHash = hashInviteSecret(presented);
  return prisma.invite.findUnique({ where: { tokenHash } });
}

export type EffectiveStatus = 'unused' | 'used' | 'revoked' | 'disabled' | 'expired';

export function effectiveStatus(
  invite: { status: string; expiresAt: Date | null },
  now: Date = new Date(),
): EffectiveStatus {
  if (invite.status !== 'unused') return invite.status as EffectiveStatus;
  if (invite.expiresAt && invite.expiresAt <= now) return 'expired';
  return 'unused';
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function expiryToDate(
  expiry: '24h' | '7d' | '30d' | 'never',
  now: Date = new Date(),
): Date | null {
  switch (expiry) {
    case '24h':
      return new Date(now.getTime() + HOUR_MS * 24);
    case '7d':
      return new Date(now.getTime() + DAY_MS * 7);
    case '30d':
      return new Date(now.getTime() + DAY_MS * 30);
    case 'never':
      return null;
  }
}
