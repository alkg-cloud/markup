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
 * listed in `MARKUP_ALLOWED_ORIGINS` (comma-separated). In `NODE_ENV=
 * development` only, common quick-tunnel hostnames (`*.trycloudflare.com`,
 * `*.ngrok.io`, `*.ngrok-free.app`) are auto-allowed so QA-via-tunnel
 * doesn't require re-editing `.env.local` on every `cloudflared` restart
 * (the tunnel URL is fresh each run). Production never auto-allows —
 * `NODE_ENV=production` evaluates the strict allow-list only.
 *
 * `Origin` absent → treated as **same-origin OK**. Two cases that arrive
 * without Origin: (a) non-browser automation (curl, agents) that already
 * holds a credential (cookie via login or Bearer) — for these the CSRF
 * model does not apply; (b) same-origin top-level form posts in some
 * legacy browsers. Both are accepted; the threat model is the cross-site
 * forged request, which always carries an Origin.
 */
export function isSameOrigin(req: Request): boolean {
  const presented = req.headers.get('origin');
  if (!presented) return true; // no Origin → not a forgeable cross-site request
  let url: URL;
  try {
    url = new URL(presented);
  } catch {
    return false;
  }
  if (getAllowedOrigins().has(url.origin)) return true;
  if (isDevTunnelOrigin(url.hostname)) return true;
  return false;
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

function canonicalOrigin(s: string): string | null {
  try {
    return new URL(s).origin;
  } catch {
    return null;
  }
}

// Mirrors `allowedDevOrigins` in `next.config.mjs`. Kept in lockstep so a
// tunnel host that Next dev's HMR accepts is the same one the CSRF check
// accepts — without this divergence, dev hydration works but POSTs fail
// with `forbidden_origin`, which is the exact split that broke `/login`
// from the cloudflared tunnel.
const DEV_TUNNEL_SUFFIXES = ['.trycloudflare.com', '.ngrok.io', '.ngrok-free.app'];

function isDevTunnelOrigin(hostname: string): boolean {
  if (process.env.NODE_ENV !== 'development') return false;
  return DEV_TUNNEL_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

let cachedAllowed: Set<string> | null = null;
let cachedAppUrl: string | undefined;
let cachedExtra: string | undefined;

function getAllowedOrigins(): Set<string> {
  const appUrl = env().APP_URL;
  const extra = process.env.MARKUP_ALLOWED_ORIGINS;
  if (cachedAllowed && cachedAppUrl === appUrl && cachedExtra === extra) {
    return cachedAllowed;
  }
  const set = new Set<string>();
  const app = canonicalOrigin(appUrl);
  if (app) set.add(app);
  if (extra) {
    for (const raw of extra.split(',')) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const o = canonicalOrigin(trimmed);
      if (o) set.add(o);
    }
  }
  cachedAllowed = set;
  cachedAppUrl = appUrl;
  cachedExtra = extra;
  return set;
}
