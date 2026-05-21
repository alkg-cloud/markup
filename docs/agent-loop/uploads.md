# Agent-Loop Upload Endpoints

The upload endpoints are the agent-loop's entry point for new mockup content and replacement versions. Both routes accept the same request shape and enforce the same size ceiling so the dialog, the drag-drop overlay, and external agents see one contract.

## Source-of-truth cap

The upload ceiling lives in `env().MAX_UPLOAD_MB` (default 10) — see `src/lib/env.ts`. Three call sites read from it:

- `POST /api/mockups` route handler — content-length pre-check + post-buffer check
- `POST /api/mockups/[id]/version` route handler — same two checks
- `src/lib/mockup/service.ts` extractor — `maxTotalBytes` cap on the uncompressed total

The client-side preflight (`src/lib/upload/constants.ts`) mirrors this value as a hardcoded constant because Next.js does not expose non-`NEXT_PUBLIC_` env vars to the browser. Bumping the server cap requires updating the client constant in the same change-set.

## `POST /api/mockups`

Create a mockup from an upload.

**Auth:** cookie OR Bearer. CSRF-guarded via `assertSameOrigin`.

**Request body (`multipart/form-data`):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Must match `URL_SAFE_NAME_PATTERN` (`^[A-Za-z0-9_-]+$`) |
| `build` | Blob | yes | Either a full zip OR a raw HTML document — branched at the route by MIME, with the filename extension as the fallback hint when MIME is `application/octet-stream` |
| `slug` | string | no | Override the derived slug |
| `projectId` | string | no | Drop-target project; FK validated against `Project` |
| `folderId` | string | no | Drop-target folder; FK validated against `Folder`, must belong to `projectId` when both are set |
| `status` | string | no | One of `open` / `resolved` / `archived` |

Raw HTML in `build` is wrapped into a single-entry `index.html` zip by `wrapHtmlAsZip` before extraction — the drag-drop dialog uses this path so the browser doesn't have to depend on JSZip. Anything else is written straight to the temp zip path and passed to the extractor.

**Response 201:**

```jsonc
{
  "id": "cmox…",
  "currentVersionId": "cmox…",
  "slug": "lumen-landing",
  "name": "lumen-landing",
  "status": "open",
  "projectId": "cmox…" | null,
  "folderId": "cmox…" | null
}
```

**Errors:**

| Status | `error` | When |
|---|---|---|
| 400 | `invalid_body` | `name` missing, `build` not a Blob, or optional fields wrong type |
| 400 | `name_too_long` | `name` exceeds `NAME_MAX_LENGTH` (64 chars); response also carries `limit: 64` |
| 400 | `name_not_url_safe` | `name` fails `URL_SAFE_NAME_PATTERN` (length check runs first) |
| 400 | `project_not_found` | `projectId` doesn't resolve |
| 400 | `folder_not_found` | `folderId` doesn't resolve |
| 400 | `folder_project_mismatch` | `folderId` belongs to a different project than `projectId` |
| 400 | `upload_rejected` | Extractor rejected the zip (zipslip, missing `index.html`, banned extension, per-file cap, file-count cap, etc.) — `detail` carries the extractor message |
| 401 | `unauthorized` | No identity |
| 403 | `forbidden_origin` | Cross-origin request |
| 413 | `file_too_large` | Body exceeds `env().MAX_UPLOAD_MB`; response carries `limit` (bytes) |

The 413 is emitted twice: once by content-length (cheap, pre-buffer) and once by `buffer.byteLength` (catches chunked transfer-encoding clients that omit content-length). Both carry the same `error` + `limit` shape.

## `POST /api/mockups/[id]/version`

Create a new version of an existing mockup from an upload. Used by the dialog's Replace mode and by agents pushing a fresh build.

**Auth:** cookie OR Bearer. CSRF-guarded.

**Request body (`multipart/form-data`):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `build` | Blob | yes | Zip or raw HTML — same content-type routing as `POST /api/mockups` |

**Response 201:**

```jsonc
{ "id": "cmox…", "mockupId": "cmox…", "createdAt": "2026-05-21T…" }
```

**Errors:**

| Status | `error` | When |
|---|---|---|
| 400 | `invalid_body` | `build` not a Blob |
| 400 | `upload_rejected` | Extractor rejected the upload (`detail` carries the message) |
| 401 | `unauthorized` | No identity |
| 403 | `forbidden_origin` | Cross-origin request |
| 413 | `file_too_large` | Body exceeds `env().MAX_UPLOAD_MB`; `limit` (bytes) on the response |

The size guard mirrors `POST /api/mockups` so a single drop cannot smuggle past the cap by toggling Replace mode in the dialog.

## Patch vs full-upload

This route is the **full-upload** path. Agents that want to ship a focused change should prefer `PATCH /api/mockups/[id]/version-patch` (unified diff against a base version) — see [Endpoints](endpoints.md). The full upload is the right move when the patch base is unknown, when binaries change, or when the change touches enough text that the diff is comparable in size to the file.
