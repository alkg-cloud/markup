import 'server-only';

import { prisma } from '@/lib/prisma';
import { type SessionPayload, signSession, verifySession } from './jwt';

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function createSession(userId: string) {
  const session = await prisma.session.create({
    data: { userId, expiresAt: new Date(Date.now() + TTL_SECONDS * 1000) },
  });
  const token = await signSession({ sessionId: session.id, userId }, TTL_SECONDS);
  return { token, session };
}

export async function getSession(token: string) {
  let payload: SessionPayload;
  try {
    payload = await verifySession(token);
  } catch {
    return null;
  }
  const row = await prisma.session.findUnique({ where: { id: payload.sessionId } });
  if (!row || row.expiresAt < new Date()) return null;
  return { sessionId: row.id, userId: row.userId };
}

export async function invalidateSession(sessionId: string) {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

export async function invalidateAllSessions() {
  await prisma.session.deleteMany();
}

export const SESSION_COOKIE = 'mk_session';
export const SESSION_TTL_SECONDS = TTL_SECONDS;
