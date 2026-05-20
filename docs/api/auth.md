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

`SameSite=Lax` on the session cookie blocks most cross-site cookie sends; the Origin check is the second lock for redirect/legacy paths that leak. The auth/login, auth/setup, and auth/logout endpoints also run the guard (a CSRF could otherwise log a victim into an attacker-controlled account or wipe their session).

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
