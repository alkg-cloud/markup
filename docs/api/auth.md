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

## When to require admin

The `User.role` field is always `'admin'` today (single-tenant first-run setup). If a future deployment introduces non-admin users, gate the admin-only routes via:

```ts
if (ident.kind !== 'user') return NextResponse.json({ error: 'forbidden_role' }, { status: 403 });
const user = await prisma.user.findUnique({ where: { id: ident.userId } });
if (user?.role !== 'admin') return NextResponse.json({ error: 'forbidden_role' }, { status: 403 });
```

The `/api/agent-tokens` family is the existing admin-only surface; the others are open to any authenticated identity.

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
