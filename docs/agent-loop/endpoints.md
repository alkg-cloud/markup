# Agent-Loop Endpoints

Each endpoint is a stable contract. Updates to response shape, auth, or error codes go through this doc first.

## `GET /api/agent/context/[annotationId]`

Single-call aggregator. Reads everything an agent needs to start working on a fix.

**Auth:** cookie OR Bearer.

**Response 200:**

```jsonc
{
  "annotation": {
    "id": "cmox…",
    "mockup_id": "cmox…",
    "pin_coords": { /* parsed JSON or null — LEGACY, dropped after Phase 13 */ },
    "anchors": [
      /* Array of Anchor objects per pin-anchoring spec.
         text-anchor:    { path, textOffset, subX, subY }
         element-anchor: { path, offsetX, offsetY } */
    ],
    "color_index": 0,
    "status": "open",
    "created_by": "cmox…",
    "created_by_type": "user",
    "created_at": "2026-05-08T19:19:56.939Z",
    "created_on_version_id": "cmox…"
  },
  "thread": {
    "id": "cmox…",
    "status": "open",
    "messages": [
      {
        "id": "cmox…",
        "author_type": "user",
        "author_id": "cmox…",
        "author_display_name": "Alexandre Camillo",
        "body": "…",
        "created_at": "…"
      }
    ]
  },
  "current_version": {
    "id": "cmox…",
    "files": { "index.html": "<!DOCTYPE html>\n…" },
    "binary_files": ["thumbnail.png"]
  },
  "diff_since_creation": "--- index.html (cmoxatba)\n+++ index.html (cmoxawxz)\n@@ -14,7 +14,9 @@\n …",
  "project": { "id": "cmox…", "name": "SaaS App", "slug": "saas-app" },
  "folder_path": "Landing Page/Hero Section"
}
```

**`current_version.files`** inlines text files only (extensions: `.html`, `.htm`, `.css`, `.js`, `.mjs`, `.json`, `.svg`, `.txt`, `.md`). Binaries are listed by name in `binary_files` — fetch them separately if needed.

**`diff_since_creation`** is empty string when the annotation was created on the current version. When non-empty, it's a unified diff of `index.html` between the creation version and the current version.

**`project`** is `null` when the mockup has no project. When present, contains `{ id, name, slug }`.

**`folder_path`** is the `/`-separated path from the project root to the mockup's folder (e.g. `"Landing Page/Hero Section"`). Empty string when the mockup is at the project root or has no folder.

**ETag:** `"<sha256(tldraw_mtime + current_version_id + last_message_id) prefix>"`. Use `If-None-Match` to short-circuit:

```
GET /api/agent/context/cmox…
If-None-Match: "ab12cd34ef567890"
→ 304 Not Modified  (no body)
```

## `PATCH /api/mockups/[id]/version-patch`

Create a new `MockupVersion` by applying unified diffs to a base version. Binary files reused from the base.

**Auth:** cookie OR Bearer (mirrors `POST /version`).

**Request body (JSON):**

```jsonc
{
  "base_version_id": "cmox…",
  "patches": {
    "index.html": "--- a/index.html\n+++ b/index.html\n@@ -14,7 +14,9 @@\n …\n",
    "styles.css": "@@ … @@\n-old\n+new\n"
  }
}
```

**Response 201:**

```jsonc
{ "id": "cmox…", "mockupId": "cmox…", "createdAt": "2026-05-08T19:21:43.176Z" }
```

**Errors:**

| Status | `error` | When |
|---|---|---|
| 400 | `invalid_body` | Body fails Zod validation |
| 400 | `patch_target_not_found` | `patches['<file>']` references a file not present in the base version |
| 400 | `patch_malformed` | `diff` package can't parse the patch |
| 401 | `unauthorized` | No identity |
| 404 | `base_version_not_found` | `base_version_id` doesn't exist or belongs to a different mockup |
| 404 | `base_version_files_missing` | Filesystem state corrupted (rare; indicates a bug) |
| 409 | `patch_conflict` | The diff's context lines don't match the base file |
| 415 | `binary_patch_unsupported` | Patch targets a non-text file (any extension outside the text allowlist) |

The text allowlist mirrors the one used by `/diff`: `.html`, `.htm`, `.css`, `.js`, `.mjs`, `.json`, `.svg`, `.txt`, `.md`. Other extensions reject with 415.

A 409 means the agent's context is stale — it should refetch `/agent/context/[aid]` and rebuild the diff against the new `current_version.files['index.html']`.

See [Patch format](patch-format.md) for the diff conventions.

## `PATCH /api/mockups/[id]`

Mutate mockup-level metadata: status, placement, or name. The optional "close-out" step that completes the agent fix cycle.

**Auth:** cookie OR Bearer; CSRF-guarded via `assertSameOrigin`.

**Request body (JSON):**

```jsonc
{
  "status":    "resolved",        // optional — "open" | "resolved" | "archived"
  "projectId": "cmox…" | null,   // optional — null to orphan the mockup
  "folderId":  "cmox…" | null,   // optional — null to move to project root
  "position":  3,                 // optional int >= 0; only honoured when projectId/folderId present
  "name":      "lumen-final"     // optional — owner-or-admin (URL-safe ^[A-Za-z0-9_-]+$, max 64 chars)
}
```

All fields optional; at least one MUST be present. The schema is strict — unknown fields return `invalid_body`.

All metadata fields (`name`, `status`, `projectId`, `folderId`, `position`) require the caller to be the recorded creator of the mockup OR an admin. Agents can rename/move/status-change mockups they created; they receive 403 `forbidden_owner` on mockups created by others.

**Response 200:** the full mockup row.

```jsonc
{
  "id":               "cmox…",
  "name":             "lumen-final",
  "slug":             "lumen-final",
  "status":           "resolved",
  "currentVersionId": "cmox…",
  "projectId":        "cmox…",
  "folderId":         "cmox…",
  "position":         3,
  "createdAt":        "2026-05-08T19:19:56.939Z",
  "updatedAt":        "2026-05-21T14:30:00.000Z"
}
```

**Errors:**

| Status | `error` | When |
|---|---|---|
| 400 | `invalid_body` | Body fails Zod (unknown field, wrong type, bad status, position < 0) |
| 400 | `name_required` | `name` present but empty after coercion |
| 400 | `name_too_long` | `name` exceeds 64 characters |
| 400 | `name_not_url_safe` | `name` violates `^[A-Za-z0-9_-]+$` |
| 400 | `no_fields` | All optional fields absent |
| 400 | `project_not_found` | `projectId` supplied but row missing |
| 400 | `folder_not_found` | `folderId` supplied but row missing |
| 400 | `folder_project_mismatch` | `folderId` belongs to a different project than `projectId` (when both present) |
| 401 | `unauthorized` | No identity |
| 403 | `forbidden_origin` | CSRF guard fired |
| 403 | `forbidden_owner` | Caller is not the recorded creator of the mockup and is not an admin |
| 404 | `not_found` | Mockup row missing |

**Concurrency:** last-write-wins; no optimistic concurrency (`If-Match` / ETag) yet. Patching `status: "resolved"` twice is a no-op at the DB level.

**Mockup `status` is independent of thread `status`.** A resolved mockup can still have open annotation threads; a re-opened mockup inherits no thread state change. Orchestrators decide when to close out; the endpoint does not auto-resolve.

**Composition with the fix cycle:**

```
1. GET  /api/agent/context/[annotationId]    # read current state
2. PATCH /api/mockups/[id]/version-patch      # ship the fix
3. POST  /api/threads/[id]/reply              # explain the fix
4. PATCH /api/mockups/[id]  { "status": "resolved" }   # optional — close out when applicable
```

Step 4 is orchestrator-decided. Most fix cycles do not close the mockup (more annotations may arrive). Only call this when the orchestrator's policy says the annotation is fully addressed.

**Rename caveat:** `name` changes the slug (the canonical URL). The owner-or-admin gate means agents can only rename mockups they themselves uploaded. If the slug changes, existing orchestrator bookmarks to `/projects/<slug>/…` break.

## `GET /api/annotations/[id]/region`

Bbox-cropped PNG of the annotation's screenshot. Sidecar-cached.

**Auth:** cookie OR Bearer.

**Response 200:**
- `Content-Type: image/png`
- `Cache-Control: private, max-age=300`
- Body: cropped PNG (typically 5–50 KB vs 200–700 KB for the full screenshot)

**Errors:**

| Status | `error` | When |
|---|---|---|
| 401 | `unauthorized` | No identity |
| 404 | `not_found` | Annotation row doesn't exist |
| 404 | `no_pin_coords` | Annotation has `pinCoords: null` (no drawn shapes) |
| 404 | `screenshot_missing` | Filesystem state corrupted |
| 500 | `invalid_pin_coords` | Stored `pinCoords` JSON is malformed |

**Bbox source:** `Annotation.pinCoords.{bboxX, bboxY, bboxW, bboxH}`, with a fixed 20px padding around the bbox clamped at image edges.

**No query params:** the bbox is fully derived from the stored pin coords. A future `?bbox=x,y,w,h` override would let agents request a different crop, but adding it would mean splitting the cache key — out of scope for v1.3.

**Caching:** sidecar `region.png`. Regenerated when `screenshot.png`'s mtime is newer than `region.png`'s. Edits to `pinCoords` (none today; pinCoords are immutable per annotation) would need a cache-key extension.

## `GET /api/mockups/[id]/diff`

Text-mode unified diff between two versions of a mockup.

**Auth:** cookie OR Bearer.

**Query params:**

| Param | Required | Values |
|---|---|---|
| `from` | yes | a `MockupVersion.id` belonging to this mockup |
| `to` | yes | a `MockupVersion.id` belonging to this mockup |
| `format` | no | `unified` (default) or `json` |

**Response 200, `format=unified`:**
- `Content-Type: text/plain; charset=utf-8`
- Body: concatenation of per-file unified diffs, one per text file, separated by blank lines. Binary files emit `Binary files <name> differ` placeholders. Empty body means no changes.

**Response 200, `format=json`:**

```jsonc
{ "diff": "--- a/index.html\n+++ b/index.html\n…", "from": "cmox…", "to": "cmox…" }
```

**Errors:**

| Status | `error` | When |
|---|---|---|
| 400 | `missing_from_to` | Either query param absent |
| 401 | `unauthorized` | No identity |
| 404 | `version_not_found` | Either `from` or `to` doesn't exist or belongs to a different mockup |

**File coverage:** text files are diffed; binaries get a placeholder. The text allowlist matches `/version-patch`.

## `PUT /api/annotations/[id]/tldraw`

Persist an updated drawing snapshot. Used when the user enters edit mode on an existing annotation.

**Auth:** cookie OR Bearer.

**Request body (JSON):** the full `TLEditorSnapshot` returned by `editor.getSnapshot()`.

**Response 200:**

```jsonc
{ "id": "cmox…" }
```

**Errors:**

| Status | `error` | When |
|---|---|---|
| 400 | `invalid_json` | Body isn't parseable JSON |
| 400 | `invalid_body` | Body isn't an object |
| 401 | `unauthorized` | No identity |
| 404 | `not_found` | Annotation row doesn't exist |

**Side effects:**
- Strips the screenshot base64 from the snapshot before persisting
- Does NOT update `pinCoords` — the stored bbox stays at the original drawing's extent. (Future improvement: recompute from the new snapshot's shape bounds.)

## `POST /api/mockups/[id]/annotations`

Create an annotation. Branches on `Content-Type`:

- `application/json` → comment-flow (preferred; the only mode the AppMain redesign uses)
- `multipart/form-data` → legacy drawing-flow (preserved for backward compatibility with older agents; do not use in new clients)

Both modes share the `mockupId` URL parameter, the auth model, and the response status (`201` on success). The body, response shape, and error codes differ — both are documented below.

### JSON body — comment-flow (preferred)

`Content-Type: application/json`

```jsonc
{
  "body":     "Headline kerning too tight at this size.",
  "anchors":  [
    /* 0..20 anchors. Each is one of:
       text-anchor:    { "path": ":scope>div>...>h1", "textOffset": 16, "subX": 0.4, "subY": 0.5 }
       element-anchor: { "path": ":scope>div>div:nth-of-type(2)",        "offsetX": 0.42, "offsetY": 0.68 } */
  ],
  "colorIndex": 0,                 // 0..15 into the rotating palette
  "status":     "open"              // "open" | "needs review" | "resolved" (optional, defaults to open)
}
```

**Response 201:**

```jsonc
{
  "id":         "cmox…",
  "threadId":   "cmox…",
  "colorIndex": 0,
  "status":     "open",
  "anchors":    [/* echo */]
}
```

**Errors (JSON mode):**

| Status | `error` | When |
|---|---|---|
| 400 | `invalid_body` | Body fails Zod (missing/extra fields, anchors > 20, `colorIndex` outside `0..15`, `status` outside the allowlist) |
| 401 | `unauthorized` | No identity |
| 403 | `forbidden_origin` | Cross-origin request (CSRF guard via `assertSameOrigin`) |
| 404 | `mockup_not_found` | `mockupId` doesn't exist (check is explicit, avoids leaking a Prisma FK 500) |

### Multipart body — legacy drawing-flow

`Content-Type: multipart/form-data`

Preserved for backward compatibility with older agents that still upload screenshot + tldraw payloads. New clients (the AppMain viewer and all post-2026-05 agents) use the JSON mode above; drawing-based annotations will return as an optional annotation kind later — see `docs/future-features.md` #23.

| Field | Type | Required |
|---|---|---|
| `screenshot` | `Blob` (PNG) | yes |
| `tldraw` | string (JSON-encoded snapshot) | yes |
| `message` | string | yes |
| `pinCoords` | string (JSON-encoded `PinCoords`) | no |

**Response 201:**

```jsonc
{ "id": "cmox…", "threadId": "cmox…" }
```

**Errors (multipart mode):**

| Status | `error` | When |
|---|---|---|
| 400 | `invalid_body` | Multipart fields missing or wrong type |
| 400 | `empty_message` | `message.trim() === ''` |
| 400 | `invalid_tldraw_json` | tldraw field doesn't parse as JSON |
| 400 | `invalid_pin_coords` | `pinCoords` JSON malformed |
| 401 | `unauthorized` | No identity |
| 403 | `forbidden_origin` | Cross-origin request (CSRF guard via `assertSameOrigin`) |

**Auth (both modes):** cookie OR Bearer.

**Side effects (both modes):**
- Strips screenshot base64 from the tldraw snapshot before writing (multipart only — the JSON mode never persists tldraw)
- Stamps `createdOnVersionId` to the mockup's current version (or the explicit `createdOnVersionId` field if passed; reserved for tooling)
- Creates a `Thread` row with `status: 'open'` and a first `Message`

## `POST /api/threads/[id]/reply`

Append a message to a thread.

**Auth:** cookie OR Bearer.

**Request body (JSON):**

```jsonc
{ "body": "…" }
```

**Response 201:**

```jsonc
{ "id": "cmox…", "createdAt": "…" }
```

**Errors:**

| Status | `error` | When |
|---|---|---|
| 400 | `invalid_body` | Body fails Zod (`body` non-empty string ≤ 10000 chars) |
| 401 | `unauthorized` | No identity |
| 404 | `not_found` | Thread doesn't exist |

`authorType` and `authorId` are taken from the calling identity.

## `POST /api/messages/[id]/reactions`

Toggle a Slack-style emoji reaction on a comment. Idempotent — if the
calling identity already reacted to the message with this emoji, the
reaction is removed; otherwise it's created.

**Auth:** cookie OR Bearer.

**Body:**

```jsonc
{ "emoji": "👍" }
```

**Response 200:** the post-mutation reaction map for the message.

```jsonc
{
  "reactions": {
    "👍": ["user_marina", "user_sam"],
    "❤️": ["user_alex"]
  }
}
```

**Errors:**

| Status | `error` | When |
|---|---|---|
| 400 | `invalid_body` | Body missing `emoji` or it's empty |
| 401 | `unauthorized` | No identity |
| 404 | `not_found` | Message doesn't exist |

The `(messageId, userId, emoji)` triple is uniquely indexed on the
`Reaction` table, so concurrent toggles are race-safe.
