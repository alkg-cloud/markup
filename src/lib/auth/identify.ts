import 'server-only';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { verifyAgentToken } from './agent-token';
import { getSession, SESSION_COOKIE } from './session';

export type Identity =
  | { kind: 'user'; userId: string; sessionId: string }
  | { kind: 'agent'; tokenId: string; name: string };

/** Extract the cuid from an Identity, regardless of kind. */
export function identityId(id: Identity): string {
  return id.kind === 'user' ? id.userId : id.tokenId;
}

interface ErrorWithStatus extends Error {
  status: number;
}

/**
 * Maps the `Error` thrown by `requireIdentity` / `requireAdmin` (and
 * any other helper that attaches `status` to its error) into a
 * `NextResponse.json({ error }, { status })`. Route handlers wrap the
 * `requireAdmin(...)` call in `try/catch` and pass the caught value
 * here so they don't redeclare the `ErrorWithStatus` shape locally.
 *
 * Unknown errors (no `status`) bubble up as 500 — same default the
 * route boilerplate used before this helper.
 */
export function handleAuthError(e: unknown): NextResponse {
  const err = e as ErrorWithStatus;
  const status = typeof err?.status === 'number' ? err.status : 500;
  const message = err?.message ?? 'internal_error';
  return NextResponse.json({ error: message }, { status });
}

type CookieJar = { get(name: string): { value: string } | undefined };

interface MaybeCookieRequest {
  cookies?: CookieJar;
  headers: Headers;
}

function readCookie(req: MaybeCookieRequest, name: string): string | undefined {
  const fromJar = req.cookies?.get(name)?.value;
  if (fromJar) return fromJar;
  const header = req.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return undefined;
}

export async function identify(req: NextRequest | Request): Promise<Identity | null> {
  const cookieToken = readCookie(req as MaybeCookieRequest, SESSION_COOKIE);
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

export async function requireAdmin(
  id: Identity | null,
): Promise<Extract<Identity, { kind: 'user' }>> {
  requireIdentity(id);
  if (id.kind !== 'user') {
    const err = new Error('forbidden_kind') as ErrorWithStatus;
    err.status = 403;
    throw err;
  }
  const user = await prisma.user.findUnique({
    where: { id: id.userId },
    select: { role: true },
  });
  if (!user || user.role !== 'admin') {
    const err = new Error('forbidden_role') as ErrorWithStatus;
    err.status = 403;
    throw err;
  }
  return id;
}
