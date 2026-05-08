# Agent Loop Overview

## The cycle

The unit of work is **one annotation → one fix → one reply**:

1. **User comments**
   - Open `/mockups/[id]` in the browser
   - Click `+ Comment` to capture the iframe + open the modal
   - Pick a chip (`visual` / `copy` / `behavior` / `other`) — see [chips](chips.md)
   - Draw + write a free-text comment
   - Save → creates `Annotation` + `Thread` + first `Message`; tldraw snapshot saved with screenshot base64 stripped; `intentType` and `createdOnVersionId` stamped on the annotation row

2. **Agent reads context**
   - `GET /api/agent/context/[annotationId]` (Bearer or cookie auth) returns a single payload: annotation metadata + parsed intent (drawings + DOM-resolved bbox + computed styles) + thread + current version source inline + `diff_since_creation`
   - First call materialises the `intent.json` sidecar (puppeteer cold start ~3s); subsequent calls hit the sidecar (sub-50ms)
   - ETag header allows the agent to short-circuit when nothing has changed

3. **Agent applies the fix**
   - For text-only file changes (HTML/CSS/JS): `PATCH /api/mockups/[id]/version-patch` with a unified diff per file. Binary files (thumbnail.png) are reused from the base version by reference.
   - For larger architectural changes: `POST /api/mockups/[id]/version` with a full zip — same flow as the user-uploaded version
   - Either path creates a new `MockupVersion` row + extracted build directory and updates `Mockup.currentVersionId`

4. **Agent replies**
   - `POST /api/threads/[id]/reply` with the message body
   - The reply is appended to `Thread.messages`; `authorType: 'agent'` and `authorId: <tokenId>`

5. **User reviews**
   - Reload the mockup viewer; the iframe now serves the new version
   - Open the annotation page; thread shows both messages
   - User either resolves the thread (`POST /api/threads/[id]/resolve`) or replies again (loop continues)

## Why a single-call aggregator

Without `/context`, the legacy flow needed:

1. `GET /api/annotations/[id]` — annotation metadata
2. `GET /api/annotations/[id]/screenshot` — full screenshot (~600 KB)
3. Read `tldraw.json` somehow (no public endpoint; the agent had to query SQLite directly or fetch via `/m/` and parse the iframe)
4. Read the mockup HTML via `/m/[id]/index.html`
5. `GET /api/threads/[id]` — thread state
6. `POST /api/mockups/[id]/version` — full zip rebuild

That's six round-trips, ~660 KB upstream, and Chrome MCP roundtrips for any agent that wanted DOM-at-bbox resolution. The new flow collapses 1–5 into a single `GET /context` and replaces 6 with a 1–5 KB `PATCH /version-patch`. See [INDEX](INDEX.md) for the byte budget.

## Why intent_type matters

The G1 chip persists `intentType: 'visual' | 'copy' | 'behavior' | 'other'` on the annotation row. This isn't enforced at the routing layer (yet) — every agent sees every annotation. But:

- It seeds **future routing** (item #22 in `docs/future-features.md`) — when multi-agent routing ships, agents declare specialties and the inbox filters annotations by tag derived from `intentType`
- It surfaces **product analytics** today — what fraction of annotations are visual vs copy vs behavior — without needing to LLM-classify every comment
- It signals **agent self-routing** — a designer-bot can `GET /agent/context/[aid]` and see `intent_type: 'visual'`, deciding whether to act based on its own scope

Agents that don't care about the chip simply ignore the field. The chip is opt-in for the user, defaulting to `'other'` when they don't pick.

## Why patch-style versioning

A typical fix touches one CSS rule or a few HTML lines. Re-uploading the entire zip means:

- The agent rebuilds the zip in memory and uploads it (~10 KB to 600 KB depending on assets)
- The server re-extracts and re-validates the entire build
- A diff between the previous and new version is hard to compute concisely

`PATCH /version-patch` accepts `{ base_version_id, patches: { "index.html": "<unified diff>" } }`:

- The agent sends the smallest possible payload (typically <2 KB)
- The server applies the diff against the base version's files in memory, validates the result, and produces the new version's build
- Binary files (thumbnail.png) are reused by reference — no need to ship them again
- A 409 conflict response forces the agent to refetch context (which means it gets the latest HTML and rebuilds the diff against it)

## Why the diff_since_creation field

When an agent loops back to verify its own work — or when a different agent picks up the same annotation later — the `diff_since_creation` field shows what changed in `index.html` between the version that was current when the user drew on it and the version that's current now. This lets the second agent decide:

- The fix already shipped → resolve and move on
- The fix shipped but the comment is about something different → reply with the new context
- Nothing changed → apply the fix

Without this field, the second agent would need to fetch both versions and diff them itself. With it, the comparison is one read away.

## Auth model

All agent-loop endpoints accept **cookie OR Bearer**. The same surface serves the browser UI (cookie) and the automation agent (Bearer). See [`docs/api/auth.md`](../api/auth.md) for why.

## Failure modes the contract guards against

| Failure | Guard |
|---|---|
| Agent applies a stale patch | `base_version_id` required on `/version-patch`; conflict returns 409, agent refetches |
| Agent reads a stale intent | `intent.json` keyed by `(tldraw_mtime, current_version_id)`; cache invalidated by `updateAnnotationTldraw` |
| Agent infinite-loops on a comment it can't address | No automatic guard — agents must enforce their own per-annotation retry budget |
| Two agents fix the same annotation simultaneously | Currently no lock; the second `version-patch` will succeed (creates a v3 on top of the agent's v2). Multi-agent claim/lock is parked as #22 |
