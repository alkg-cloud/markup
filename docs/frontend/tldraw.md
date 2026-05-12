# Tldraw integration

Tldraw is the on-screen drawing canvas used in two places:

1. **Annotation modal** (`AnnotationModal.tsx`) — the user draws over a screenshot when creating a comment
2. **Annotation detail edit mode** (`ReadOnlyAnnotation.tsx` despite the name) — the user can re-open an existing annotation and edit its drawings

The same `AnnotationCanvas` wrapper drives both surfaces. The wrapper handles the screenshot insertion, snapshot persistence, edit-mode toggle, and the StrictMode dedup safety guard.

## Snapshot model

Tldraw v5 represents canvas state as a `TLEditorSnapshot` JSON blob containing the full store: pages, shapes, assets, instance state. The annotation persists this blob to `${DATA_DIR}/mockups/<mid>/annotations/<aid>/tldraw.json`.

The screenshot itself is a tldraw image asset + image shape pair, locked at position `(0, 0)` with the full screenshot dimensions. User-drawn shapes (arrows, geo, text, freehand) sit on top.

## Base64 strip

Tldraw embeds image asset `src` as a `data:image/png;base64,…` URL inside the snapshot. For the screenshot — a ~600 KB PNG — this means every save serialises the screenshot **twice**: once as the file `screenshot.png` on disk, once as base64 inside `tldraw.json`. A 600 KB PNG becomes ~800 KB base64.

The wrapper in `src/lib/tldraw/snapshot-screenshot.ts` strips the screenshot's `src` at save time and replaces it with a marker on the top-level asset `meta` field: `asset.meta.externalRef = 'screenshot'`. At read time, the marker is rehydrated to the actual screenshot URL (`/api/annotations/[id]/screenshot`). The marker lives on `asset.meta` (not `asset.props.meta`) because tldraw validates `props` strictly against its schema. The on-disk `tldraw.json` shrinks ~99% — typical sizes are 2–5 KB instead of 640 KB+.

```ts
// At save:
const stripped = stripScreenshotBase64(input.tldrawJson);
fs.writeFileSync(path, JSON.stringify(stripped));

// At read:
const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
const tldraw = rehydrateScreenshotBase64(raw, `/api/annotations/${id}/screenshot`);
```

The strip is **idempotent** — calling `stripScreenshotBase64` twice produces the same output. This keeps the migration script safe to re-run.

## StrictMode dedup

React 18+ Strict Mode fires effects twice in dev. Tldraw's `<Tldraw>` component invokes `onMount` from inside an effect, so the mount handler runs twice. Without a guard, it creates **two screenshot assets and two image shapes** on top of each other.

The wrapper's mount handler checks for an existing screenshot asset before creating one:

```ts
const handleMount = useCallback((editor: Editor) => {
  if (snapshot) {
    editor.loadSnapshot(snapshot);
    editor.updateInstanceState({ isReadonly: !editable });
  } else {
    // Skip the second StrictMode invocation
    const existing = editor.getAssets()
      .find((a) => a.type === 'image' && a.props.name === 'screenshot');
    if (existing) return;

    // … create asset + shape
  }
}, [/* … */]);
```

The check makes the handler **idempotent across remounts**, not just StrictMode-safe. Production wouldn't hit StrictMode, but route navigation back/forward triggers the same remount path.

## Edit mode toggle

`AnnotationCanvas` accepts an `editable` prop. When loading an existing snapshot:

- `editable === false` (default): `editor.updateInstanceState({ isReadonly: true })` — toolbar hidden, shapes locked
- `editable === true`: editor stays unlocked, toolbar shows

The detail page (`ReadOnlyAnnotation.tsx`) starts in read-only mode and exposes an "Edit drawings" button that flips local state to editable. On save, the button POSTs `editor.getSnapshot()` to `PUT /api/annotations/[id]/tldraw`.

## Camera + viewport

The canvas wrapper sizes its container via the parent's `aspectRatio: ${width} / ${height}` — the screenshot's intrinsic PNG dimensions read from the IHDR header. This makes the canvas fill the column at the right aspect for the screenshot, regardless of the column width.

Without an explicit aspect ratio, the tldraw container collapses to 0 height (`height: 100%` of an unsized parent). This was a real bug in an early v1.2 build — the entire annotation page rendered as a 2px-tall strip with the screenshot invisible. The fix is the parent `aspectRatio` rule above; the bug class is "tldraw mounted but nothing visible" and it always traces back to a missing height somewhere in the chain.

## Cache invalidation on edit

When a user edits a drawing and saves, `updateAnnotationTldraw`:

1. Deletes the `intent.json` sidecar BEFORE writing the new `tldraw.json`
2. Strips base64 + writes the new snapshot
3. Returns the annotation row

The deletion-before-write order matters: a concurrent reader hitting `/api/annotations/[id]/intent` between the cache-key check and the write could otherwise see a fresh `tldraw.json` paired with a stale `intent.json`. Deleting first guarantees that a stale read either gets the old data (key matches) or regenerates from scratch (file gone).

## Tldraw license

The watermark "Get a license for production" appears in the bottom-right of every drawing canvas in dev. This is the eval-license behaviour. For a production deployment, acquire a tldraw SDK license and plumb it through the editor mount; alternatively, replace the drawing layer with a smaller in-house SVG canvas.

This is parked as item #14 in `docs/future-features.md`.

## What lives in the snapshot

| Tldraw record kind | What it means | We handle |
|---|---|---|
| `shape: image` | The screenshot, plus any user-pasted images | Strip+rehydrate at the asset layer; never strip user pastes |
| `shape: geo` | Rectangles, ellipses, etc. | Forwarded into the intent payload as `kind: 'geo'` with `geo` discriminator |
| `shape: arrow` | The annotated-with-an-arrow case | Forwarded as `kind: 'arrow'` with absolute `from`/`to` |
| `shape: text` | Free-text label | Forwarded as `kind: 'text'` with the rich-text content flattened to a string |
| `shape: draw` | Freehand pencil | Forwarded as `kind: 'draw'` with bbox |
| `asset: image` | Image asset records | Screenshot detected by `props.name === 'screenshot'`; user pastes left alone |
| `page`, `document`, `instance` | Tldraw bookkeeping | Preserved verbatim |

The forward-into-intent step is implemented in `src/lib/intent/parser.ts` and exercised by the unit tests under `tests/unit/lib/intent/parser.test.ts`. See [`docs/agent-loop/intent-payload.md`](../agent-loop/intent-payload.md) for the consumer side.
