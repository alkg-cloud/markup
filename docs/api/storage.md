# Storage

All persistent blobs (mockup zips, extracted versions, annotation screenshots, drawing snapshots, sidecar caches) live under a single root path: `${DATA_DIR}/`.

## Directory layout

```
${DATA_DIR}/
├── mockups/
│   └── <mockupId>/
│       ├── thumbnail.png                    # mockup card preview (≥ 64 bytes)
│       ├── versions/
│       │   └── <versionId>/
│       │       ├── source.zip                # original upload (or composed from patches)
│       │       └── build/                    # extracted contents
│       │           └── index.html, assets/, …
│       └── annotations/
│           └── <annotationId>/
│               ├── screenshot.png            # base capture (immutable per annotation)
│               ├── tldraw.json               # drawing snapshot (mutable via PUT)
│               ├── intent.json               # sidecar cache (regenerated on read)
│               └── region.png                # bbox crop (regenerated on read)
└── tmp/
    └── version-<cuid>.zip                    # short-lived patch composition staging
```

`DATA_DIR` is required (validated by `src/lib/env.ts`). In dev it points at a local path (commonly `/tmp/markup-dev-data`); in tests `tests/setup.ts` sets it to `<repo>/test-data` and wipes it between tests; in production the Docker volume mount supplies `/app/data`.

## Path helpers

`src/lib/mockup/storage.ts` is the single source of truth for path composition:

```ts
versionBuildDir(root, mockupId, versionId)         // <root>/mockups/<mid>/versions/<vid>/build
versionSourceZipPath(root, mockupId, versionId)    // <root>/mockups/<mid>/versions/<vid>/source.zip
thumbnailPath(root, mockupId)                       // <root>/mockups/<mid>/thumbnail.png
annotationDir(root, mockupId, annotationId)         // <root>/mockups/<mid>/annotations/<aid>/
```

Routes and services compose paths via these helpers — never hardcode the layout. When the layout changes, edit the helpers + this doc + the migration script.

## Sidecar caching

Files derived from the primary blobs are stored as **sidecars** in the same directory. Conventions:

| Sidecar | Source | Cache key | Invalidator |
|---|---|---|---|
| `intent.json` | `tldraw.json` + the mockup's current version's HTML | `(tldraw_mtime, current_version_id)` | `updateAnnotationTldraw` deletes it before writing the new tldraw; current-version changes naturally bypass via the key |
| `region.png` | `screenshot.png` + the annotation's `pinCoords` | `screenshot_mtime` (compared against `region.png`'s mtime) | regenerated when `screenshot.png` is newer than `region.png` |

The sidecar wrapping format for JSON caches is:

```json
{
  "key": "<computed cache key>",
  "payload": { /* the actual response body */ }
}
```

The reader checks `wrapped.key === expectedKey`; on mismatch it returns `null` and the route regenerates. See `src/lib/intent/cache.ts`.

## Atomic writes

Sidecars are written with a single `fs.writeFileSync(path, body)`. For the small payloads in question (~1–10 KB JSON, ~20–100 KB cropped PNGs), this is atomic enough on local filesystems.

If a future change introduces a sidecar that takes meaningful time to compose (multi-MB renderings, multi-step composition), switch to the write-temp-then-rename pattern:

```ts
fs.writeFileSync(path + '.tmp', body);
fs.renameSync(path + '.tmp', path);
```

## Cleanup

- **Annotations** cascade-delete from `Mockup` via Prisma's `onDelete: Cascade`. The DB row goes; the on-disk directory does NOT auto-delete. A future cleanup script under `scripts/` will reclaim those orphans.
- **Versions** are kept indefinitely. There is no version-pruning policy yet.
- **Sidecars** are reclaimed implicitly: deleting an annotation directory removes them.
- **`tmp/`** holds short-lived zip composition files used by `addVersionFromFiles`. Each call writes one and deletes it in a `finally`. Crashed processes may leave orphans; safe to wipe periodically.

## Permissions

- The Docker entrypoint chowns `${DATA_DIR}` to `${PUID}:${PGID}` and runs Node as that user
- All written files inherit the Node process's umask (default 022 → mode 0644 for files, 0755 for dirs)
- No file is executable; no symlinks are followed in user-supplied zips (the extractor in `src/lib/mockup/zip-extractor.ts` rejects them)

## Upload limits

Enforced by `src/lib/mockup/zip-extractor.ts` against the `buildLimits()` helper, which reads from env:

| Var | Default | Meaning |
|---|---|---|
| `MAX_UPLOAD_MB` | 10 | Total upload size cap (zip or raw HTML) |
| `MAX_FILES_PER_UPLOAD` | 1000 | File count cap inside a zip |
| `MAX_FILE_SIZE_MB` | 10 | Per-file uncompressed cap |

`MAX_UPLOAD_MB` is the single source of truth for the cap. The route handlers (`POST /api/mockups`, `POST /api/mockups/[id]/version`) gate the request body by content-length before buffering; the zip-extractor enforces the same ceiling against the uncompressed total. The client-side preflight in `src/lib/upload/constants.ts` mirrors this default and must be bumped in lockstep when the server cap moves.

Exceeding any of these throws a typed error that the route translates to 413/400.

## Backup

`${DATA_DIR}` plus the SQLite DB are the entire backup surface. To back up:

```bash
docker stop markup
tar -czf markup-backup-$(date +%F).tar.gz -C /path/to/markup-data .
docker start markup
```

For online backup use SQLite's online-backup API or `litestream` against the DB; the `${DATA_DIR}` blob layer is safe to rsync hot since files are append-mostly (mockup zips and annotation snapshots don't get rewritten in place).
