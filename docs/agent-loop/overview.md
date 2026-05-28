# Agent Loop Overview

## The cycle

The unit of work is **one annotation → one fix → one reply**:

1. **User comments**
   - Open `/mockups/[id]` in the browser
   - Click `+ Comment` to drop one or more anchored pins
   - Write a free-text comment in the draft card
   - Send → creates `Annotation` + `Thread` + first `Message`; `createdOnVersionId` stamped on the annotation row

2. **Agent reads context**
   - `GET /api/agent/context/[annotationId]` (Bearer or cookie auth) returns a single payload: annotation metadata + thread + current version source inline + `diff_since_creation`
   - ETag header allows the agent to short-circuit when nothing has changed

3. **Agent applies the fix**
   - For text-only file changes (HTML/CSS/JS): `PATCH /api/mockups/[id]/version-patch` with a unified diff per file. Binary files (thumbnail.png) are reused from the base version by reference.
   - For larger architectural changes: `POST /api/mockups/[id]/version` with a full zip — same flow as the user-uploaded version
   - Either path creates a new `MockupVersion` row + extracted build directory and updates `Mockup.currentVersionId`

4. **Agent replies**
   - `POST /api/threads/[id]/reply` with the message body
   - The reply is appended to `Thread.messages`; `authorType: 'agent'` and `authorId: <tokenId>`

4.5 **(optional) Agent closes the mockup**
   - When the agent's policy says "this annotation was the last open thread and the fix shipped clean," `PATCH /api/mockups/[id]` with `{ "status": "resolved" }`
   - Skip this step otherwise — most fix cycles don't close the mockup (more annotations may arrive)
   - See [endpoints.md § PATCH /api/mockups/[id]](endpoints.md#patch-apimockupsid) for the full field list and composition notes

5. **User reviews**
   - Reload the mockup viewer; the iframe now serves the new version
   - Open the annotation page; thread shows both messages
   - User either resolves the thread (`POST /api/threads/[id]/resolve`) or replies again (loop continues)

## Why a single-call aggregator

Without `/context`, the legacy flow needed:

1. `GET /api/annotations/[id]` — annotation metadata
2. `GET /api/annotations/[id]/screenshot` — full screenshot (~600 KB)
3. Read the mockup HTML via `/m/[id]/index.html`
4. `GET /api/threads/[id]` — thread state
5. `POST /api/mockups/[id]/version` — full zip rebuild

That's five round-trips, ~660 KB upstream. The new flow collapses 1–4 into a single `GET /context` and replaces 5 with a 1–5 KB `PATCH /version-patch`. See [INDEX](INDEX.md) for the byte budget.

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
| Agent infinite-loops on a comment it can't address | No automatic guard — agents must enforce their own per-annotation retry budget |
| Two agents fix the same annotation simultaneously | Currently no lock; the second `version-patch` will succeed (creates a v3 on top of the agent's v2). Multi-agent claim/lock is parked as #22 |
