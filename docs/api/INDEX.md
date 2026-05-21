# API

The Markup API is a set of Next.js App Router route handlers under `src/app/api/`. There is no separate backend service — routes share the same Prisma client and filesystem layout as the UI.

## Read first

- [Routes](routes.md) — naming, params handling, `force-dynamic`, error shape
- [Auth](auth.md) — `identify()` accepts cookie OR Bearer; `kind: 'user' | 'agent'`
- [Authz](authz.md) — DELETE permissions matrix; `canDelete` predicate; `requireOwnerOrAdmin`; cascade rules; error codes
- [Storage](storage.md) — `${DATA_DIR}/` layout, sidecar files, atomic-write pattern

## Surface map

### Auth

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Email + password → session cookie |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `POST` | `/api/auth/setup` | First-run admin creation (idempotent) |
| `GET` | `/api/auth/setup-status` | Public — returns `{ completed: boolean }` so `/login` and `/setup` can route themselves client-side |
| `GET` | `/api/auth/me` | Resolve the current identity into `{ kind, id, name?, email? }` for the client-side auth guard |

### Home

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/home` | Workspace home aggregator — identity + greeting (time-of-day + 24h updated count) + recents (top 6 by `updatedAt`, cross-project incl. orphans, with breadcrumb) + projects (same payload as `/api/projects`) + orphans (all mockups with `projectId === null`, by `updatedAt` desc). Single fetch used by `/`. |

### Projects

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/projects` | List all projects ordered by `position`. Each entry includes `id`, `name`, `slug`, `icon`, `position`, `mockupCount`, `folderCount`, `createdAt`, `updatedAt` — used by the sidebar tree and by third-party consumers; the `/` home page uses `/api/home` instead |
| `POST` | `/api/projects` | Create project (`name`) |
| `GET` | `/api/projects/[id]` | Single project metadata |
| `PATCH` | `/api/projects/[id]` | Update project (`name`) |
| `DELETE` | `/api/projects/[id]` | Delete project (mockups orphaned via SetNull) |
| `GET` | `/api/projects/[id]/tree` | Full recursive tree (folders + mockups) for sidebar |
| `POST` | `/api/projects/[id]/folders` | Create folder (`name`, optional `parentId`) |
| `POST` | `/api/projects/reorder` | Reorder projects (`ids` array) |
| `GET` | `/api/projects/by-slug/[slug]/view` | Aggregator for `/projects/[slug]` — project + root folders/mockups + breadcrumb |
| `GET` | `/api/projects/by-slug/[slug]/resolve?path=…` | Aggregator for `/projects/[slug]/[...path]` — returns folder or mockup payload with breadcrumbs |

### Folders

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/folders/[id]` | Single folder with children + mockups |
| `PATCH` | `/api/folders/[id]` | Update folder (`name`) |
| `DELETE` | `/api/folders/[id]` | Delete folder (children cascade, mockups orphaned) |
| `POST` | `/api/folders/[id]/move` | Move folder (`parentId`, `position`) with cycle detection |

### Mockups

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/mockups` | List (cursor-paged by status) |
| `POST` | `/api/mockups` | Create from upload (multipart: `name` + `build` — `build` accepts a zip OR a raw HTML doc; optional `projectId` + `folderId`). 413 `file_too_large` when the body exceeds `env().MAX_UPLOAD_MB`. See [agent-loop/uploads](../agent-loop/uploads.md). |
| `GET` | `/api/mockups/[id]` | Single mockup metadata |
| `DELETE` | `/api/mockups/[id]` | Delete mockup (versions, annotations, threads cascade; see [authz.md](authz.md) for ownership gate) |
| `POST` | `/api/mockups/[id]/move` | Move mockup (`projectId`, `folderId`, `position`) |
| `POST` | `/api/mockups/[id]/version` | Add new version from upload (zip or raw HTML; same 413 cap as `POST /api/mockups`). See [agent-loop/uploads](../agent-loop/uploads.md). |
| `PATCH` | `/api/mockups/[id]/version-patch` | Add new version from unified diff |
| `GET` | `/api/mockups/[id]/diff?from=<vid>&to=<vid>&format=unified\|json` | Text-mode diff |
| `GET` | `/api/mockups/[id]/diff-versions?from=<vid>&to=<vid>` | Aggregator for `/mockups/[id]/diff` — resolves the version pair + viewer href + timestamps |
| `GET` | `/api/mockups/[id]/viewer` | Aggregator for the mockup viewer page — mockup + versions + annotations + thread tree + display names |
| `GET` | `/api/mockups/[id]/thumbnail` | PNG thumbnail (sidecar) |
| `POST` | `/api/mockups/[id]/thumbnail` | Replace thumbnail |
| `GET` | `/api/mockups/[id]/versions` | List versions |
| `GET` | `/api/mockups/[id]/versions/[vid]/source` | Inspect a version's files |
| `POST` | `/api/mockups/[id]/versions/[vid]/promote` | Make a past version current |

### Annotations

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/mockups/[id]/annotations` | List annotations on a mockup |
| `POST` | `/api/mockups/[id]/annotations` | Create (multipart: screenshot + tldraw + message + intent_type) |
| `GET` | `/api/annotations/[id]` | Single annotation metadata |
| `GET` | `/api/annotations/[id]/screenshot` | Full PNG screenshot |
| `GET` | `/api/annotations/[id]/region` | Bbox-cropped PNG (sidecar-cached) |
| `GET` | `/api/annotations/[id]/intent` | Server-resolved intent (sidecar-cached) |
| `GET` | `/api/annotations/[id]/detail` | Aggregator for `/annotations/[id]` — annotation + screenshot dims + tldraw JSON + thread + names + mockup blurb + viewerHref |
| `PUT` | `/api/annotations/[id]/tldraw` | Persist edited drawings |

### Agent

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/agent/context/[annotationId]` | Single-call aggregator (annotation + intent + thread + inline source + diff_since_creation + project + folder_path) |

### Threads

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/threads/[id]` | Thread + messages |
| `POST` | `/api/threads/[id]/reply` | Append a message |
| `POST` | `/api/threads/[id]/resolve` | Mark resolved |
| `POST` | `/api/threads/[id]/reopen` | Reopen a resolved thread |

### Agent tokens

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/agent-tokens` | List (admin only) |
| `POST` | `/api/agent-tokens` | Create (returns `plaintext` once) |
| `DELETE` | `/api/agent-tokens/[id]` | Revoke |

### Invites

- `GET /api/invites` — admin, list invites with `effectiveStatus` surfaced.
- `POST /api/invites` — admin, create an invite; returns plaintext once.
- `DELETE /api/invites/[id]` — admin, revoke (if unused) or hard-delete (if terminal).
- `POST /api/invites/revoke-all` — admin, bulk-revoke every unused-not-expired invite.
- `DELETE /api/invites/history` — admin, bulk-delete every terminal row (including computed expired).
- `GET /api/invites/[token]/state` — public, anti-enumeration probe (`{ usable, boundEmail }` / `{ usable: false, reason }`).
- `POST /api/invites/[token]/redeem` — public, rate-limited, creates the User + session cookie.

### Shell

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/shell` | Single aggregator for `AppShell` — viewer profile + tree (projects + orphans) + mockup names + recents map + persisted sidebar-collapsed flag |

### Mockup serve

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/m/[mockupId]/[...path]` | Serve a file from the current (or `?v=<vid>`) version's build |

This is the only non-`/api` route that reads from `${DATA_DIR}` — it powers the iframes used in the viewer and the puppeteer pass that resolves DOM at bbox.

## Cross-cutting

### Auth-required by default

All routes call `identify(req)` first, except for three documented public surfaces:

| Route | Why public |
|---|---|
| `GET /api/health` | Container healthcheck — must respond before any session can exist |
| `POST /api/auth/login` | Entry point that establishes the session |
| `POST /api/auth/setup` | First-run admin creation; no identity exists yet |
| `GET /api/auth/setup-status` | Drives client-side routing for `/login` and `/setup` before any session can exist |

Each of these routes carries an inline comment documenting the reason. Any new public surface must do the same.

### Dynamic by default

API routes export `dynamic = 'force-dynamic'`. The Next 16 default ("static if possible") would cache GETs that read cookies/DB rows.

### Error shape

```jsonc
{
  "error": "snake_case_code",       // machine-readable, stable across releases
  "file": "index.html"               // optional context (per-error)
}
```

`error` is the primary identifier — clients match on it. Optional fields carry context. Status codes follow HTTP conventions (400 invalid input, 401 unauthenticated, 403 forbidden, 404 missing, 409 conflict, 415 unsupported media, 500 unexpected).

### Rate limiting

Implemented in `src/lib/rate-limit.ts` (token bucket). Applied per-route as needed; not all routes are gated. See the route source for whether a limiter is wired.
