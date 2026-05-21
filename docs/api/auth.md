# Auth

A single `identify(req)` helper resolves both human and agent identities. Routes never re-implement parsing or validation.

## Identity model

```ts
type Identity =
  | { kind: 'user'; userId: string }
  | { kind: 'agent'; tokenId: string };
```

`identify()` returns `Identity | null`. `null` means unauthenticated and the route returns 401.

## Resolution order

`identify()` tries cookie first, then Bearer, then gives up:

1. **Cookie**: read `mk_session` from `req.cookies.get(SESSION_COOKIE)` or the `cookie` header. If present and the JWT (HS256, signed with `AUTH_SECRET`) verifies, return `{ kind: 'user', userId }`.
2. **Bearer**: read `Authorization: Bearer mk_<hex>`. If the SHA-256 of the value matches a row in `AgentToken.tokenHash`, update `lastUsedAt` and return `{ kind: 'agent', tokenId }`.
3. Otherwise: `null`.

```ts
export async function GET(req: Request) {
  const ident = await identify(req);
  if (!ident) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // …
}
```

## Why cookie OR Bearer

The same routes are consumed by:

- The browser UI (cookie-authenticated)
- Automation clients — AI dev assistants (Claude Code, Cursor, Aider), agent frameworks (LangGraph, CrewAI, AutoGen), in-house CI integrations (Bearer-authenticated)
- The dev's own curl smoke tests (typically cookie via `-b cookies.txt` or Bearer via `-H "Authorization: Bearer …"`)

Splitting the surface by auth mode would force automation clients to use a different endpoint than the UI, which doubles the maintenance burden. The single-surface design means **a feature shipped to the UI is automatically available to agents**, and vice versa.

## The mockup-serve route

`GET /m/[mockupId]/[[...path]]` serves the extracted HTML/CSS/JS bundle of a mockup version. It runs the same `identify(req)` check as every API route and returns 401 if absent. The proxy in `src/proxy.ts` lists `/m/` as a public path prefix only because the edge-runtime proxy can't run Prisma — the per-request auth check happens inside the route handler.

The browser iframe sends the session cookie automatically (same origin); agents authenticate via `Authorization: Bearer mk_<hex>`.

## When to require admin

The `User.role` field is checked by `requireAdmin`. The helper looks up the user row by `userId` and returns 403 `forbidden_role` if `user.role !== 'admin'`; agent tokens get 403 `forbidden_kind` instead. All admin routes call:

```ts
try {
  await requireAdmin(await identify(req));
} catch (e) {
  return handleAuthError(e);
}
```

`/api/invites` (the first feature to gate by `role`) drives this; `/api/agent-tokens` is gated the same way.

## Author attribution

When persisting a row that records who created it, map the identity to a single string + a kind:

```ts
authorId: ident.kind === 'user' ? ident.userId : ident.tokenId,
authorType: ident.kind,
```

`authorType` is `'user' | 'agent'` and is stored on `Annotation.createdByType`, `Message.authorType`, and `MockupVersion.createdByType`. The display layer resolves the cuid to a name via `resolveDisplayName` in `src/lib/auth/resolve-display-name.ts` — never render a raw cuid in the UI.

## Session lifetime

Sessions live 30 days, refreshed on every request that succeeds in cookie auth. The JWT carries `sessionId`, `userId`, `iat`, `exp`. The corresponding `Session` row has `expiresAt`; expired sessions are rejected during JWT verification (the JWT `exp` is set from `Session.expiresAt` at issue time).

To force a logout, delete the `Session` row — the JWT will still verify until expiry but `identify()` checks the row exists.

## Stale-cookie self-heal on `/api/auth/me`

`GET /api/auth/me` is the only auth-status endpoint the SPA polls (`useRequireAuth` calls it on every shell mount). When the request carries an `mk_session` cookie that `identify()` rejects (bad signature after `AUTH_SECRET` rotation, deleted user, expired `Session` row), the 401 response includes a `Set-Cookie: mk_session=; Max-Age=0` directive to expire the bad cookie. This is required because the edge proxy in `src/proxy.ts` can't validate the JWT (no `jose` at edge) — it only checks cookie presence. Without the self-heal, a stale cookie traps the client in a loop: `/api/auth/me` returns 401 → client redirects to `/login` → proxy sees the cookie and bounces `/login` back to `/` → `/api/auth/me` 401 again. Clearing the cookie at the source breaks the loop without bloating proxy code.

## CSRF guard

Every state-changing route (POST/PUT/PATCH/DELETE) calls `assertSameOrigin(req)` at the top of the handler:

```ts
import { assertSameOrigin } from '@/lib/auth/origin';

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  // … identify, validate, mutate
}
```

The helper validates the `Origin` header against `env.APP_URL` plus a comma-separated `MARKUP_ALLOWED_ORIGINS` allow-list. Cross-origin requests get `{ error: 'forbidden_origin' }` with status 403. Requests **without** `Origin` (curl, automation tools, Bearer-authed agents) pass through — the CSRF threat model targets cookie-authed browser requests, which always carry an Origin.

Under `NODE_ENV=development` only, the helper additionally auto-allows quick-tunnel hostnames matching `*.trycloudflare.com`, `*.ngrok.io`, or `*.ngrok-free.app`. This pairs with `allowedDevOrigins` in `next.config.mjs` (which keeps the Turbopack HMR client happy on tunnel hosts) so QA-via-tunnel doesn't fail on the first POST with `forbidden_origin`. Production never auto-allows — `NODE_ENV=production` falls back to the strict allow-list and tunnels must be added to `MARKUP_ALLOWED_ORIGINS` explicitly. The suffix list lives in `src/lib/auth/origin.ts` (`DEV_TUNNEL_SUFFIXES`) and must stay in lockstep with `next.config.mjs`.

`SameSite=Lax` on the session cookie blocks most cross-site cookie sends; the Origin check is the second lock for redirect/legacy paths that leak. The auth/login, auth/setup, and auth/logout endpoints also run the guard (a CSRF could otherwise log a victim into an attacker-controlled account or wipe their session).

## Invite lifecycle

An invite row in `Invite` has five lifecycle states; four are persisted in `status` (`'unused' | 'used' | 'revoked' | 'disabled'`) and the fifth, `'expired'`, is **derived** at read time as `status='unused' AND expiresAt <= now()` (see `effectiveStatus()` in `src/lib/auth/invite-token.ts`).

### Redemption contract

`POST /api/invites/[token]/redeem` is the only path that can flip a row from `'unused'` to `'used'`. The route opens a single Prisma `$transaction` containing **both** the `User.create` and the `Invite.updateMany({ where: { id, status: 'unused' }, data: { status: 'used', usedAt, usedById } })`. If the conditional `updateMany` returns `count: 0` — i.e. another transaction beat us to the row — the transaction throws and Prisma rolls back the `User.create`. The response is 410 `invite_unusable`.

After a 201 response, three invariants hold simultaneously:

1. A `User` row exists with the requested email and the invite's role.
2. The `Invite` row has `status='used'`, `usedAt = now`, and `usedById = newUser.id`.
3. A session cookie is set on the response.

A DB-level partial-unique index on `Invite.usedById` (where `usedById IS NOT NULL`) is the second lock that enforces invariant (2) physically: at most one invite row in the database can reference any given user.

### Error codes

| Status | `error` | When |
|---|---|---|
| 201 | _none_ | Success; row is now `'used'`, session cookie set |
| 400 | `invalid_token` | Token doesn't match `mki_…` shape |
| 400 | `invalid_body` | Zod parse failed (email format, password < 12, name length) |
| 401 | `email_mismatch` | Bound-email mismatch **or** existing-user silent collision |
| 410 | `invite_unusable` | Row is no longer in effective `'unused'` (incl. raced concurrent redeem) |
| 429 | `rate_limited` | Per-IP limiter; `retry-after` header populated |
| 500 | `invite_redeem_failed` | Unexpected transaction failure (logged with stack) |

The `email_mismatch` code intentionally covers both the bound-email case and the existing-user collision case so a public caller cannot enumerate registered emails.

## Agent token lifecycle

| Step | What happens |
|---|---|
| Create | `POST /api/agent-tokens` returns `{ plaintext, id, name }` once. The plaintext is shown to the admin and never persisted server-side. |
| Use | Agent sends `Authorization: Bearer <plaintext>`; server hashes and looks up. |
| Track | `lastUsedAt` updates on every successful auth (fire-and-forget; doesn't block the request). |
| Revoke | `DELETE /api/agent-tokens/[id]` removes the row. The plaintext, if leaked, becomes useless on the next request. |

Boot-time tokens are seeded from the `AGENT_TOKENS` env var (`name1:secret1,name2:secret2`). The seeder is idempotent — re-running with the same env var skips existing rows.

## Dev shortcuts

For local curl smoke tests, the cookie path is fastest:

```bash
curl -s -c /tmp/markup-cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"longpassword12345"}'
# subsequent calls
curl -s -b /tmp/markup-cookies.txt http://localhost:3000/api/mockups
```

For Bearer testing, create a token via the cookie path first, then pivot:

```bash
TOKEN=$(curl -s -b /tmp/markup-cookies.txt -X POST /api/agent-tokens \
  -H 'Content-Type: application/json' \
  -d '{"name":"test"}' | jq -r .plaintext)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/mockups
```

The plaintext is only returned on creation — store it immediately.
