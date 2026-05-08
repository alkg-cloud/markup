# Intent Payload

The shape returned by `GET /api/annotations/[id]/intent` and embedded in `GET /api/agent/context/[annotationId]` under the `intent` key.

## Full shape

```jsonc
{
  "annotation_id": "cmox…",
  "comment": "the CTA looks like a secondary link, not a primary action",
  "intent_type": "visual",
  "drawings": [
    { "kind": "arrow", "from": [880, 1007], "to": [113, 1048] },
    {
      "kind": "geo",
      "geo": "rectangle",
      "color": "red",
      "fill": "none",
      "bbox": [880, 1149, 72, 30],
      "text": ""
    },
    {
      "kind": "text",
      "content": "Numbers crashing into titles",
      "bbox": [190, 958, 483, 50]
    }
  ],
  "annotated_dom": [
    {
      "selector": "p",
      "text_at_point": "Wait 45 seconds. The grounds will exhale",
      "computed": {
        "color": "rgb(74, 58, 44)",
        "background": "rgba(0, 0, 0, 0)",
        "fontSize": "15px",
        "fontFamily": "\"Iowan Old Style\", Georgia, serif",
        "contrast_aa": 9.1
      },
      "ancestors": ["div.step", "section.ritual", "body"]
    }
  ],
  "viewport": { "width": 1464, "height": 892, "scrollY": 0 }
}
```

## Field-by-field

### `annotation_id`

The annotation's cuid. Echoes the path param. Useful when an agent batches multiple calls and routes responses back to the right context.

### `comment`

The first message body from the annotation's thread — i.e. what the user wrote when creating the annotation. Subsequent replies are not included; the agent reads the full thread via `/agent/context` if it needs them.

### `intent_type`

The G1 chip the user picked at creation time. One of `'visual' | 'copy' | 'behavior' | 'other'`. Defaults to `'other'` when the user didn't pick. See [chips](chips.md).

### `drawings`

Array of structured shapes parsed from the tldraw snapshot. The shape variants are a discriminated union:

```ts
type Drawing =
  | { kind: 'arrow'; from: [number, number]; to: [number, number] }
  | { kind: 'geo'; geo: string; color: string; fill: string; bbox: [number, number, number, number]; text: string }
  | { kind: 'text'; content: string; bbox: [number, number, number, number] }
  | { kind: 'draw'; bbox: [number, number, number, number] };
```

**Coordinates are in iframe page-space**, the same coordinates the user drew on. The bbox is `[x, y, w, h]` with origin at top-left.

**Image shapes are skipped** — the screenshot itself is not surfaced as a drawing. Only user-drawn shapes appear.

The parser implementation is `src/lib/intent/parser.ts`. Adding support for a new tldraw shape kind means:

1. Extend the `Drawing` union with the new variant
2. Add a branch to `extractDrawings`
3. Add a unit test under `tests/unit/lib/intent/parser.test.ts`

### `annotated_dom`

Array of DOM nodes resolved from the drawings' bbox centers via headless puppeteer. Each entry:

```ts
{
  selector: string;       // e.g. ".step:nth-child(3) > p" — minimal, not stable
  text_at_point: string;  // text under the bbox center, ~30 chars
  computed: {
    color: string;        // CSS rgb(…)
    background: string;   // CSS rgb(…) or rgba(…)
    fontSize: string;     // CSS px
    fontFamily: string;
    contrast_aa?: number; // WCAG ratio fg/bg, computed Node-side
  };
  ancestors: string[];    // up to 3 levels: ["tag.cls", …]
}
```

**Resolution algorithm:**

1. For each drawing with a `bbox`, take the center point. For arrows, take the `to` endpoint.
2. Open the mockup in headless Chromium at the annotation's `viewport` dimensions
3. Scroll so the probe point is in the center of the viewport
4. `document.elementFromPoint(...)` for the element + `document.caretRangeFromPoint(...)` for the text under the cursor
5. Read computed styles + walk up to 3 ancestors

**Caveats:**

- The `selector` is **NOT a stable test selector**. It's a hint — agents should match against `text_at_point` or `computed.color` to identify what was annotated, not to construct an XPath.
- `text_at_point` is a 30-char window around the caret; for longer text, the agent reads the full HTML from `current_version.files['index.html']` and matches by substring.
- `contrast_aa` is the WCAG fg/bg contrast ratio computed in Node (not in the browser). It's only present when both `color` and `background` parse to RGB; otherwise omitted.
- When the bbox center is not over a meaningful element (empty space), the entry is still emitted but `text_at_point` is empty and `selector` is `body` or similar.

### `viewport`

The viewport dimensions stored on the annotation's `pinCoords` — the dimensions of the user's browser when they drew. Puppeteer renders at the same viewport so the DOM resolution is faithful. `scrollY` is the scroll position when the screenshot was captured.

## Caching

The payload is materialised as a sidecar `intent.json` next to the annotation's `tldraw.json`. The cache wrapper format:

```jsonc
{
  "key": "<tldraw_mtime>:<current_version_id>",
  "payload": { /* the full intent payload */ }
}
```

**Hit path:** the route reads `intent.json`, checks `wrapped.key === expectedKey`, returns `wrapped.payload`. No puppeteer launched. Sub-50ms.

**Miss path:** the route runs puppeteer, computes the payload, writes the sidecar, returns the payload.

**Invalidation:**

- `PUT /api/annotations/[id]/tldraw` deletes the sidecar BEFORE writing the new tldraw — see [Endpoints](endpoints.md#put-apiannotationsidtldraw)
- A new mockup version (uploaded or patched) doesn't physically delete the sidecar; the cache key includes `current_version_id`, so a stale sidecar is detected on read and bypassed
- The annotation row's deletion cascades to the on-disk directory cleanup (when implemented)

The cache helper lives in `src/lib/intent/cache.ts`. The wrapper's two functions:

```ts
readIntentCache<T>(annDir, key): Wrapped<T> | null
writeIntentCache<T>(annDir, key, payload): void
deleteIntentCache(annDir): void
```

## Failure modes

If puppeteer fails (browser launch error, page navigation timeout, element resolution exception), the route returns a degraded payload with `annotated_dom: []` and the rest filled in from the tldraw + DB read. The agent gets the drawings and the comment but no DOM resolution.

The route does NOT return 503 in this case — a degraded payload is more useful to the agent than a complete failure. Agents that depend on `annotated_dom` should check whether the array is non-empty before acting on it.

## Token-cost reasoning

A typical intent payload is **~1–3 KB JSON**. The breakdown:

- `comment` (free text): ~50–500 bytes
- `drawings`: ~200 bytes per shape × 1–10 shapes = ~200–2000 bytes
- `annotated_dom`: ~300 bytes per probe × 1–5 probes = ~300–1500 bytes
- `viewport` + scaffolding: ~100 bytes

For an agent reading 5 annotations to triage them, the cumulative cost is ~5–15 KB. The legacy flow (full screenshot read) was ~600 KB per annotation.

## What's NOT in the payload

- **The full mockup HTML** — that's in `current_version.files` on `/agent/context`, not on `/intent`. `/intent` is the per-annotation derivation; `/context` is the everything-the-agent-needs aggregator.
- **The screenshot bytes** — fetch `/api/annotations/[id]/screenshot` (full) or `/region` (cropped) when needed.
- **A "suggested fix"** — the agent decides what to do based on the comment + DOM. LLM-derived suggestions are parked as item #20 in `docs/future-features.md`.
