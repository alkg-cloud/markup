import type { NextRequest } from 'next/server';

import { verifyAgentToken } from './agent-token';
import { getSession, SESSION_COOKIE } from './session';

export type Identity =
  | { kind: 'user'; userId: string; sessionId: string }
  | { kind: 'agent'; tokenId: string; name: string };

interface ErrorWithStatus extends Error {
  status: number;
}

export async function identify(req: NextRequest): Promise<Identity | null> {
  const cookieToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookieToken) {
    const sess = await getSession(cookieToken);
    if (sess) return { kind: 'user', userId: sess.userId, sessionId: sess.sessionId };
  }
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const tok = auth.slice('Bearer '.length).trim();
    const found = await verifyAgentToken(tok);
    if (found) return { kind: 'agent', tokenId: found.id, name: found.name };
  }
  return null;
}

export function requireIdentity(id: Identity | null): asserts id is Identity {
  if (!id) {
    const err = new Error('unauthorized') as ErrorWithStatus;
    err.status = 401;
    throw err;
  }
}

export function requireAdmin(
  id: Identity | null,
): asserts id is Extract<Identity, { kind: 'user' }> {
  requireIdentity(id);
  if (id.kind !== 'user') {
    const err = new Error('admin only') as ErrorWithStatus;
    err.status = 403;
    throw err;
  }
}
