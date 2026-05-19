import 'server-only';

import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

/**
 * CSRF defense in depth: validate the `Origin` header on state-changing
 * requests (POST/PUT/PATCH/DELETE). The browser sends `Origin` on every
 * non-GET fetch initiated from a page; a CSRF page on `evil.example`
 * cannot forge it. SameSite=Lax already blocks most cross-site cookie
 * sends, but a few legacy/edge browsers and redirect flows leak — this
 * is the second lock for cookie-authed mutations.
 *
 * Same-origin is "Origin matches `env.APP_URL` host:port" or any value
 * listed in `MARKUP_ALLOWED_ORIGINS` (comma-separated). Local dev tunnels
 * (cloudflared / ngrok) join the list via env, not via wildcard, so
 * prod is always closed by default.
 *
 * `Origin` absent → treated as **same-origin OK**. Two cases that arrive
 * without Origin: (a) non-browser automation (curl, agents) that already
 * holds a credential (cookie via login or Bearer) — for these the CSRF
 * model does not apply; (b) same-origin top-level form posts in some
 * legacy browsers. Both are accepted; the threat model is the cross-site
 * forged request, which always carries an Origin.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // no Origin → not a forgeable cross-site request
  const appUrl = env().APP_URL;
  if (matchesOrigin(origin, appUrl)) return true;
  const extra = process.env.MARKUP_ALLOWED_ORIGINS;
  if (!extra) return false;
  return extra
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .some((o) => matchesOrigin(origin, o));
}

/**
 * Guard for mutating routes. Returns a 403 `NextResponse` when the
 * Origin header is present and does not match the allow-list; returns
 * `null` when the request is acceptable (same-origin or no Origin).
 *
 * Typical use, after `identify(req)`:
 *
 *   const bad = assertSameOrigin(req);
 *   if (bad) return bad;
 */
export function assertSameOrigin(req: Request): NextResponse | null {
  if (isSameOrigin(req)) return null;
  return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
}

function matchesOrigin(presented: string, allowed: string): boolean {
  try {
    const a = new URL(presented);
    const b = new URL(allowed);
    return a.origin === b.origin;
  } catch {
    return false;
  }
}
