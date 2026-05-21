# Authorisation model

Markup uses a two-axis model for every protected route. The axis are **identity kind** (user vs agent) and **role** (admin vs member). The three helpers that enforce the axes are documented here.

## Three gate helpers

| Helper | Who passes | Who is rejected |
|---|---|---|
| `identify(req)` only | Any authenticated identity (user or agent) | Unauthenticated |
| `requireAdmin(ident)` | Users with `role = 'admin'` | Members (403 `forbidden_role`); agents (403 `forbidden_kind`) |
| `requireOwnerOrAdmin(ident, entity)` | Admin users; members who are the recorded creator of `entity` | Members who did not create the entity (403 `forbidden_owner`); agents on all entity kinds except their own messages (403 `forbidden_kind`) |

Owner-or-admin routes call `requireOwnerOrAdmin(ident, entity)`. The helper fetches `user.role` fresh from the database on every call so mid-session demotions take effect without forcing a re-login. If the user is an admin the call returns immediately; otherwise it evaluates the ownership predicate below. Returns 403 `forbidden_kind` for agents (agents never delete via the matrix routes, per §4 below).

Cross-link: see [auth.md](auth.md) for the `requireAdmin` pattern and CSRF guard.

## The `canDelete(viewer, entity)` predicate

Pure function shared by the API check (`requireOwnerOrAdmin`) and the React UI gate (`useCanDelete`). A single predicate prevents the server and client from drifting.

```ts
type DeletableEntity =
  | { kind: 'project';       createdById: string | null }
  | { kind: 'folder';        createdById: string | null }
  | { kind: 'mockup';        createdById: string | null }
  | { kind: 'mockupVersion'; createdBy: string; createdByType: 'user' | 'agent' }
  | { kind: 'annotation';    createdBy: string; createdByType: 'user' | 'agent' }
  | { kind: 'message';       authorId: string;  authorType: 'user' | 'agent' };

type Viewer =
  | { kind: 'user';  userId: string; role: 'admin' | 'member' }
  | { kind: 'agent'; tokenId: string };

function canDelete(viewer: Viewer, entity: DeletableEntity): boolean;
```

Rules:

1. **Admin always passes.** `viewer.kind === 'user' && viewer.role === 'admin'` → `true` for every entity kind.
2. **Message exception for agents.** `entity.kind === 'message' && viewer.kind === entity.authorType && viewer.id === entity.authorId` → `true`. An agent may delete its own messages (the agent loop sometimes cleans up draft replies). An agent may not delete any other entity kind.
3. **Agent identity is rejected on all other entity kinds** (`forbidden_kind`).
4. **Member checks the recorded creator.** `viewer.kind === 'user'` and entity has a `createdById` / `createdBy` field matching `viewer.userId` and `createdByType === 'user'` → `true`.
5. **`null` `createdById` is forbidden for members.** Legacy rows that pre-date the `createdById` column carry `NULL`. Members cannot claim ownership of a row they have no recorded link to. Admins pass via rule (1).

## `null` `createdById` on legacy rows

The `createdById` migration is additive — existing rows keep `NULL`. Members cannot delete `NULL`-owned rows; admins can. This is deliberate:

- We do not know who originally created legacy content.
- A "first admin" backfill would falsely attribute ownership.
- `NULL` signals "no recorded owner → admin-only deletable" — the conservative default.

As soon as the migration ships, every pre-existing project, folder, and mockup is admin-only-deletable forever. New rows carry `createdById` from the moment they are created.

## Agent identity has no delete privilege on the matrix routes

An agent Bearer token authenticates via `Authorization: Bearer mk_<hex>`. Agents can `POST`, `PATCH`, and `GET` the standard routes (annotations, versions, mockups, messages) but **cannot DELETE** them. The delete handlers return 403 `forbidden_kind` for any `kind: 'agent'` identity on every entity kind except messages (§message exception above).

Rationale: deletes are destructive; the agent loop never needs to delete. The version-patch flow creates new versions — it does not rewrite history. Orchestrators that consume this API should not wire DELETE into their toolchain; use `PATCH /api/mockups/[id]/version-patch` to update content.

## DELETE permissions matrix

| Entity | Column used | Admin | Member who created it | Member who did not | Agent |
|---|---|---|---|---|---|
| `Project` | `createdById` | ✓ | ✓ (cascade check — see below) | ✗ `forbidden_owner` | ✗ `forbidden_kind` |
| `Folder` | `createdById` | ✓ | ✓ (cascade check) | ✗ `forbidden_owner` | ✗ `forbidden_kind` |
| `Mockup` | `createdById` | ✓ | ✓ | ✗ `forbidden_owner` | ✗ `forbidden_kind` |
| `MockupVersion` | `createdBy` + `createdByType` | ✓ | ✓ (user-authored only) | ✗ `forbidden_owner` | ✗ `forbidden_kind` |
| `Annotation` | `createdBy` + `createdByType` | ✓ | ✓ (user-authored only) | ✗ `forbidden_owner` | ✗ `forbidden_kind` |
| `Message` | `authorId` + `authorType` | ✓ | ✓ (user-authored only) | ✗ `forbidden_owner` | own messages only |
| `Invite` | n/a | ✓ | admin-only by design | ✗ `forbidden_role` | ✗ `forbidden_kind` |
| `AgentToken` | n/a | ✓ | admin-only by design | ✗ `forbidden_role` | ✗ `forbidden_kind` |

Agent-authored versions and annotations (`createdByType === 'agent'`) are deletable only by admins. Members who reviewed an agent's version should not be able to silently erase it; that would violate the audit trail. The admin override is the escape hatch.

## Cascade-delete rule for projects and folders

When a member deletes a project or folder they own, the server checks whether any nested mockup or sub-folder was created by someone else. If so, the request returns 409 `cascade_blocked_by_other_owner`. The member must either ask an admin to delete the container or move the foreign-owned content out first.

Admins skip this check — admin override applies to the full cascade.

The check is atomic: the count query and the delete run inside a single Prisma `$transaction` to prevent the race between a parallel `POST /api/mockups` and the cascade-check window.

## Error codes

| Code | Status | Meaning |
|---|---|---|
| `forbidden_owner` | 403 | The viewer did not create this entity and is not an admin |
| `forbidden_kind` | 403 | The identity kind (agent) is not permitted on this route |
| `forbidden_role` | 403 | The user's role is insufficient (admin-only route) |
| `cascade_blocked_by_other_owner` | 409 | The project or folder contains content created by other users; only an admin can delete the container |

## Two-layer enforcement

The server is authoritative. The UI hides Delete actions for forbidden rows as a UX nicety — it does not prevent a determined actor from sending the request. Any such request returns 403 as documented above.

The UI uses `useCanDelete(entity)` which calls the same `canDelete` predicate against the `IdentityContext`. Delete items are hidden (not disabled) when the predicate returns `false`. See [feature-catalog.md](../feature-catalog.md) `[fc:delete-button-gating]` for the UI rule.
