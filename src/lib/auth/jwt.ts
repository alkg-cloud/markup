import 'server-only';

import { jwtVerify, SignJWT } from 'jose';
import { env } from '@/lib/env';

export interface SessionPayload {
  sessionId: string;
  userId: string;
}

function key() {
  return new TextEncoder().encode(env().AUTH_SECRET);
}

export async function signSession(payload: SessionPayload, ttlSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(key());
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, key());
  if (typeof payload.sessionId !== 'string' || typeof payload.userId !== 'string') {
    throw new Error('invalid session payload');
  }
  return { sessionId: payload.sessionId, userId: payload.userId };
}
