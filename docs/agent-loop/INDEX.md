# Agent Loop

The agent loop is the **first-class product surface** of Markup. A user creates an annotation; an automation client reads the annotation, applies a fix, and replies. The endpoints under this folder are the contract that consumers depend on — AI dev assistants (Claude Code, Cursor, Aider), agent frameworks (LangGraph, CrewAI, AutoGen), and in-house orchestrators alike.

Silent drift in any of these endpoints breaks consumers. See the [agent-loop rule](../../CLAUDE.md#agent-loop-rule-strict--non-negotiable) for the strict-update policy.

## Read first

- [Overview](overview.md) — the cycle end-to-end with byte costs
- [Endpoints](endpoints.md) — `/intent`, `/context`, `/version-patch`, `/region`, `/diff`, `/tldraw`
- [Uploads](uploads.md) — `POST /api/mockups`, `POST /api/mockups/[id]/version` (raw HTML + zip, size cap)
- [Intent payload](intent-payload.md) — what `/intent` returns + caching semantics
- [Patch format](patch-format.md) — unified-diff conventions for `/version-patch`
- [Chips](chips.md) — G1 intent vocabulary

## At a glance

A complete cycle from user comment to agent reply:

```
USER (browser)                    AGENT (Bearer or cookie)
─────────────                     ──────────────────
+ Comment, pick chip [visual]     │
draw + textarea + save            │
   POST /annotations              │
   creates Annotation +           │
   Thread + Message + tldraw.json │
   (base64 stripped)              │
                                  GET /api/agent/context/[aid]
                                   ↓ aggregator (item C)
                                   ├─ annotation + intent_type
                                   ├─ intent (item B, sidecar-cached)
                                   │   ├─ drawings parsed from tldraw
                                   │   └─ annotated_dom from puppeteer
                                   ├─ thread (msgs + status)
                                   └─ current_version
                                       ├─ files: { "index.html": <inline> }
                                       └─ diff_since_creation (unified)
                                  
                                  PATCH /api/mockups/[id]/version-patch
                                   body: { base_version_id, patches: { file: <unified diff> } }
                                   server validates → creates new version
                                  
                                  POST /api/threads/[tid]/reply
```

## Token budget per cycle

| Step | Bytes | Notes |
|---|---|---|
| `GET /context` | ~3–10 KB JSON | Single read; ETag-cacheable for the no-change case |
| `PATCH /version-patch` | ~0.5–5 KB body | Unified diff; binary files reused from base by reference |
| `POST /reply` | ~0.5–2 KB body | Plain text |
| **Total** | **~5–15 KB** per round-trip | Replaces the legacy 6+ round-trip flow that ran ~660 KB upstream |

These numbers come from the v1.3 spec and are baseline expectations — keep them honest as the schema grows. If a change pushes a single endpoint past its category, restate the budget in this doc.

## Surface ownership

The agent-loop endpoints are **not generic CRUD**. They have non-trivial semantics that other parts of the codebase don't need to know about:

- `intent.json` sidecar caching → see [Intent payload](intent-payload.md)
- Puppeteer browser singleton → see `src/lib/intent/puppeteer.ts`
- Unified-diff apply / render → see `src/lib/diff/apply-unified.ts` and `render-unified.ts`
- ETag composition for `/context` → see [Endpoints](endpoints.md)

When a change touches any of those, the matching doc here is the contract — update it first.

## Out of scope

The following items are designed but not shipped — they live in [`docs/future-features.md`](../future-features.md):

| ID | Item | Why parked |
|---|---|---|
| #20 | LLM-derived intent classification | Adds vendor SDK + per-call cost; G1 chips cover the common case |
| #21 | Agent sub-role header (`X-Agent-Subrole`) | Cheap (~0.5d), park until 3+ personas are deployed |
| #22 | Multi-agent routing / inbox | Depends on #20 + #21; co-spec with the multi-agent role taxonomy in #7 |
