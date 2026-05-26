# Authorisation model

Markup uses a two-axis model for every protected route. The axis are **identity kind** (user vs agent) and **role** (admin vs member). The three helpers that enforce the axes are documented here.

## Three gate helpers

| Helper | Who passes | Who is rejected |
|---|---|---|
| `identify(req)` only | Any authenticated identity (user or agent) | Unauthenticated |
| `requireAdmin(ident)` | Users with `role = 'admin'` | Members (403 `forbidden_role`); agents (403 `forbidden_kind`) |
| `requireOwnerOrAdmin(ident, entity)` | Admin users; members who are the recorded creator of `entity` | Non-admin viewers (users and agents) who are not the recorded creator of `entity` (403 `forbidden_owner`) |

Owner-or-admin routes call `requireOwnerOrAdmin(ident, entity)`. The helper fetches `user.role` fresh from the database on every call so mid-session demotions take effect without forcing a re-login. If the user is an admin the call returns immediately; otherwise it evaluates the ownership predicate below. Agents pass when they are the recorded creator of the entity; otherwise the call returns 403 `forbidden_owner`.

Cross-link: see [auth.md](auth.md) for the `requireAdmin` pattern and CSRF guard.

## The `canDelete(viewer, entity)` predicate

Pure function shared by the API check (`requireOwnerOrAdmin`) and the React UI gate (`useCanDelete`). A single predicate prevents the server and client from drifting.

```ts
type DeletableEntity =
  | { kind: 'project';       createdBy: string | null; createdByType: 'user' | 'agent' | null }
  | { kind: 'folder';        createdBy: string | null; createdByType: 'user' | 'agent' | null }
  | { kind: 'mockup';        createdBy: string | null; createdByType: 'user' | 'agent' | null }
  | { kind: 'mockupVersion'; createdBy: string;        createdByType: 'user' | 'agent' }
  | { kind: 'annotation';    createdBy: string;        createdByType: 'user' | 'agent' }
  | { kind: 'message';       authorId: string;         authorType: 'user' | 'agent' };

type Viewer =
  | { kind: 'user';  userId: string; role: 'admin' | 'member' }
  | { kind: 'agent'; tokenId: string };

function canDelete(viewer: Viewer, entity: DeletableEntity): boolean;
```

Rules:

1. **Admin always passes.** `viewer.kind === 'user' && viewer.role === 'admin'` → `true` for every entity kind.
2. **Message exception.** `entity.kind === 'message'` → match by `(authorId, authorType)` vs `(viewerId, viewer.kind)`.
3. **Polymorphic match.** For every other entity, `viewer.kind === entity.createdByType && viewerId === entity.createdBy` → `true`. Otherwise `false`.
4. **`null` `createdBy` is admin-only.** Legacy / orphaned rows (post-revoke-of-token) carry `createdBy = null` and are deletable only by admins. Members and other agents see them as forbidden.

## `null` `createdBy` on legacy rows

The polymorphic-ownership migration is additive — existing rows keep `NULL`. Non-admin viewers cannot delete `NULL`-owned rows; admins can. This is deliberate:

- We do not know who originally created legacy content.
- A "first admin" backfill would falsely attribute ownership.
- `NULL` signals "no recorded owner → admin-only deletable" — the conservative default.

As soon as the migration ships, every pre-existing project, folder, and mockup is admin-only-deletable forever. New rows carry `(createdBy, createdByType)` from the moment they are created.

## Agent identity has delete privilege on its own entities

Agents may delete (and rename/move/status-change) entities they created. They are gated on entities created by other identities exactly like non-creator users.

## DELETE permissions matrix

| Entity | Column used | Admin | Member who created it | Member who did not | Agent |
|---|---|---|---|---|---|
| `Project` | `createdBy` + `createdByType` | ✓ | ✓ (cascade check — see below) | ✗ `forbidden_owner` | ✓ (own only) |
| `Folder` | `createdBy` + `createdByType` | ✓ | ✓ (cascade check) | ✗ `forbidden_owner` | ✓ (own only) |
| `Mockup` | `createdBy` + `createdByType` | ✓ | ✓ | ✗ `forbidden_owner` | ✓ (own only) |
| `MockupVersion` | `createdBy` + `createdByType` | ✓ | ✓ (user-authored only) | ✗ `forbidden_owner` | ✓ (own only) |
| `Annotation` | `createdBy` + `createdByType` | ✓ | ✓ (user-authored only) | ✗ `forbidden_owner` | ✓ (own only) |
| `Message` | `authorId` + `authorType` | ✓ | ✓ (user-authored only) | ✗ `forbidden_owner` | own messages only |
| `Invite` | n/a | ✓ | admin-only by design | ✗ `forbidden_role` | ✗ `forbidden_kind` |
| `AgentToken` | n/a | ✓ | admin-only by design | ✗ `forbidden_role` | ✗ `forbidden_kind` |

Versions and annotations are deletable by their recorded creator (user or agent) and by admins. Non-creator viewers — whether members or other agents — receive 403 `forbidden_owner`. The admin override remains the escape hatch for orphaned rows whose owning identity has been removed.

## Modify gate (PATCH / move / status routes)

Beyond DELETE, the following routes also gate by `requireOwnerOrAdmin`:

| Route | Entity |
|---|---|
| `PATCH /api/projects/[id]` | the Project |
| `PATCH /api/folders/[id]` | the Folder |
| `POST /api/folders/[id]/move` | the Folder |
| `PATCH /api/mockups/[id]` (all fields) | the Mockup |
| `POST /api/mockups/[id]/move` | the Mockup |
| `PUT /api/annotations/[id]/tldraw` | the Annotation |
| `POST /api/threads/[id]/resolve` | the parent Annotation |
| `POST /api/threads/[id]/reopen` | the parent Annotation |

Co-evolutionary writes stay open to any authenticated identity:

- `POST /api/projects`, `POST /api/projects/[id]/folders`, `POST /api/mockups`
- `POST /api/mockups/[id]/version`, `PATCH /api/mockups/[id]/version-patch`
- `POST /api/mockups/[id]/annotations`
- `POST /api/threads/[id]/reply`
- `POST /api/projects/reorder`

Agent uploads record `(createdBy = tokenId, createdByType = 'agent')` on the mockup row.

## Cascade-delete rule for projects and folders

When a non-admin viewer deletes a project or folder they own, the server checks whether any nested mockup or sub-folder was created by a different identity — matched on the `(createdBy, createdByType)` pair. If so, the request returns 409 `cascade_blocked_by_other_owner`. The viewer must either ask an admin to delete the container or move the foreign-owned content out first.

Cross-kind ownership blocks the same way — e.g. an agent-created mockup inside a user-created project blocks the user from deleting the project until an admin overrides or the mockup is moved out.

Admins skip this check — admin override applies to the full cascade.

The check is atomic: the count query and the delete run inside a single Prisma `$transaction` to prevent the race between a parallel `POST /api/mockups` and the cascade-check window.

## Error codes

| Code | Status | Meaning |
|---|---|---|
| `forbidden_owner` | 403 | The viewer did not create this entity and is not an admin |
| `forbidden_kind` | 403 | The identity kind (agent) is not permitted on this route |
| `forbidden_role` | 403 | The user's role is insufficient (admin-only route) |
| `cascade_blocked_by_other_owner` | 409 | The project or folder contains content created by other identities; only an admin can delete the container |

Note: `forbidden_kind` is emitted exclusively by `requireAdmin` on admin-only-by-design routes (`/api/agent-tokens/*`, `/api/invites/*`). `requireOwnerOrAdmin` returns `forbidden_owner` for any predicate failure.

## Two-layer enforcement

The server is authoritative. The UI hides Delete actions for forbidden rows as a UX nicety — it does not prevent a determined actor from sending the request. Any such request returns 403 as documented above.

The UI uses `useCanDelete(entity)` which calls the same `canDelete` predicate against the `IdentityContext`. Delete items are hidden (not disabled) when the predicate returns `false`. See [feature-catalog.md](../feature-catalog.md) `[fc:delete-button-gating]` for the UI rule.
