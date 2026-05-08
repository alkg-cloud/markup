# Patch Format

`PATCH /api/mockups/[id]/version-patch` accepts **unified diffs** (the format `diff -u` produces). Each file change is one entry under `patches`; the keys are file paths relative to the build root.

## Body shape

```jsonc
{
  "base_version_id": "cmox…",
  "patches": {
    "index.html": "--- a/index.html\n+++ b/index.html\n@@ -14,7 +14,9 @@\n …"
  }
}
```

The `base_version_id` anchors the diff. The server applies the patch against the files in the base version's build directory, NOT against the current version. If the diff was generated against a different version than `base_version_id` references, the patch will conflict (409) — see [Conflicts](#conflicts).

## File coverage

Only **text files** can be patched. Allowlist:

```
.html  .htm  .css  .js  .mjs  .json  .svg  .txt  .md
```

Anything else (`.png`, `.jpg`, `.woff2`, etc.) returns 415 `binary_patch_unsupported`. Binary files in the base version are reused by reference — the agent never re-uploads them.

To replace a binary file, use the full-zip endpoint `POST /api/mockups/[id]/version` instead.

## Generating a diff

Use `diff -u` against the file you read from `current_version.files['index.html']`:

```bash
# 1. Pull the current version's HTML from /agent/context
curl -s -H "Authorization: Bearer $TOKEN" /api/agent/context/$AID > ctx.json
python3 -c "import json; print(json.load(open('ctx.json'))['current_version']['files']['index.html'])" > original.html

# 2. Edit a copy
cp original.html fixed.html
$EDITOR fixed.html

# 3. Generate the diff
diff -u --label index.html --label index.html original.html fixed.html > patch.diff
```

Or, in JS:

```ts
import { createTwoFilesPatch } from 'diff';
const patch = createTwoFilesPatch('index.html', 'index.html', original, fixed, '', '', { context: 3 });
```

The `context` argument is the number of unchanged lines to include around each hunk. The default in our `render-unified.ts` helper is `3`, which is the unified-diff convention.

## Hunk header format

Standard unified-diff header:

```
@@ -<old_start>,<old_count> +<new_start>,<new_count> @@
```

Where:
- `old_start` is the 1-indexed line in the source file where the hunk begins
- `old_count` is the total number of source lines in the hunk (context + removed)
- `new_start`, `new_count` likewise for the new file

Common mistake: getting the counts wrong. The `diff` library is forgiving about `old_start` / `new_start` drift but strict about whether the context lines actually match. Use `diff -u` or `createTwoFilesPatch` — don't hand-write the hunk header.

## Conflicts

A 409 `patch_conflict` happens when the context lines in the hunk don't match the base file. Causes:

- The agent generated the diff against a different version than `base_version_id`
- The agent's mental model of the file is stale (e.g. it patched against an old fetch, not the latest)
- The file's line endings differ (CR/LF mismatch)

**Recovery:** the agent refetches `/agent/context` to get the latest `current_version.files['index.html']`, regenerates the diff, and retries with the new `base_version_id`.

The 409 response includes `file: 'index.html'` so the agent knows which patch failed if multiple were submitted.

## Preferred granularity

A patch hunk should be **as small as possible while still changing what you intend**. Three lines of context above and below is plenty. A hunk that spans 50 lines because the diff tool defaulted to maximal context is wasteful — it makes conflicts more likely (any of those 50 lines drifting causes a 409).

If you're patching multiple unrelated chunks of the same file, generate ONE diff with multiple hunks rather than splitting into multiple `patches` entries. The patches map is keyed by **file**, not by hunk — re-keying the same file twice silently overwrites the first entry.

## Multi-file patches

Submit each file as a separate key:

```jsonc
{
  "base_version_id": "cmox…",
  "patches": {
    "index.html":   "--- a/index.html\n+++ b/index.html\n@@ -1,3 +1,3 @@\n …",
    "styles.css":   "--- a/styles.css\n+++ b/styles.css\n@@ -10,2 +10,3 @@\n …",
    "scripts/x.js": "--- a/scripts/x.js\n+++ b/scripts/x.js\n@@ … @@\n …"
  }
}
```

The server applies them all atomically: if any patch fails (404 not_found, 409 conflict, 415 binary), no version is created. There is no partial-apply mode.

## Round-tripping with `/diff`

`GET /api/mockups/[id]/diff?from=v1&to=v2&format=unified` returns text in the SAME format `version-patch` accepts. To reproduce a past change:

```bash
DIFF=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "/api/mockups/$MID/diff?from=$V1&to=$V2&format=unified")

curl -s -X PATCH /api/mockups/$MID/version-patch \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n --arg base "$V3" --arg diff "$DIFF" '{base_version_id: $base, patches: {"index.html": $diff}}')"
```

This applies the v1→v2 change on top of v3. (The diff is per-file; a multi-file diff would need parsing — `/diff` returns concatenated file diffs separated by blank lines, the same format `git apply` handles.)

## Validation done by the server

After applying patches:

1. The resulting file content is run through the zip extractor's text-file size check (each file must stay within `MAX_FILE_SIZE_MB`)
2. The composed in-memory zip is written to `${DATA_DIR}/tmp/version-<cuid>.zip` and run through the standard `addVersion` path — same validation as a full upload
3. On success, the temp zip is deleted; on failure, it's deleted and the error propagates

Validation that's NOT done:

- HTML well-formedness (invalid HTML is allowed; the iframe will render whatever the browser tolerates)
- CSS validity (same)
- Reference integrity (a patch that deletes `styles.css` but leaves `<link rel="stylesheet" href="styles.css">` is allowed)

If a future version needs strict validation, add it to the post-apply step in the route.
