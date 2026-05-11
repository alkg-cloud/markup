# Agent-Loop Endpoints

Each endpoint is a stable contract. Updates to response shape, auth, or error codes go through this doc first.

## `GET /api/annotations/[id]/intent`

Server-resolved intent payload. Parses the tldraw snapshot into structured drawings and runs headless puppeteer against the current version to resolve DOM-at-bbox + computed styles.

**Auth:** cookie OR Bearer (read-only; mirrors `GET /annotations/[id]`).

**Response 200:** see [Intent payload](intent-payload.md) for the full shape and field meanings.

**Response 401 / 404:** standard.

**Caching:** sidecar `intent.json` keyed by `(tldraw_mtime, current_version_id)`. Cache hit: sub-50ms. Cache miss: 3–5s cold (puppeteer launch) or sub-500ms warm (browser singleton reused).

**Invalidation:** `updateAnnotationTldraw` deletes the sidecar BEFORE writing the new tldraw. Current-version changes are handled by the cache key including `current_version_id`.

## `GET /api/agent/context/[annotationId]`

Single-call aggregator. Reads everything an agent needs to start working on a fix.

**Auth:** cookie OR Bearer.

**Response 200:**

```jsonc
{
  "annotation": {
    "id": "cmox…",
    "mockup_id": "cmox…",
    "intent_type": "visual",
    "pin_coords": { /* parsed JSON or null */ },
    "created_by": "cmox…",
    "created_by_type": "user",
    "created_at": "2026-05-08T19:19:56.939Z",
    "created_on_version_id": "cmox…"
  },
  "intent": { /* the full payload from /intent, or null if intent generation failed */ },
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

**Implementation note:** the aggregator imports the GET handler from `/intent` directly (not via HTTP). This keeps the request in-process and avoids depending on `APP_URL`.

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
- Deletes the `intent.json` sidecar BEFORE writing the new tldraw, so a subsequent `/intent` read regenerates from scratch
- Does NOT update `pinCoords` — the stored bbox stays at the original drawing's extent. (Future improvement: recompute from the new snapshot's shape bounds.)

## `POST /api/mockups/[id]/annotations`

Create an annotation. Multipart body.

**Auth:** cookie OR Bearer.

**Form fields:**

| Field | Type | Required |
|---|---|---|
| `screenshot` | `Blob` (PNG) | yes |
| `tldraw` | string (JSON-encoded snapshot) | yes |
| `message` | string | yes |
| `pinCoords` | string (JSON-encoded `PinCoords`) | no |
| `intent_type` | `'visual' \| 'copy' \| 'behavior' \| 'other'` | no |

**Response 201:**

```jsonc
{ "id": "cmox…", "threadId": "cmox…" }
```

**Errors:**

| Status | `error` | When |
|---|---|---|
| 400 | `invalid_body` | Multipart fields missing or wrong type |
| 400 | `empty_message` | `message.trim() === ''` |
| 400 | `invalid_tldraw_json` | tldraw field doesn't parse as JSON |
| 400 | `invalid_pin_coords` | `pinCoords` JSON malformed |
| 400 | `invalid_intent_type` | `intent_type` not in allowed set |
| 401 | `unauthorized` | No identity |

**Side effects:**
- Strips screenshot base64 from the tldraw snapshot before writing
- Stamps `createdOnVersionId` to the mockup's current version (or the explicit `createdOnVersionId` field if passed; reserved for tooling)
- Defaults `intentType` to `'other'` when omitted
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
