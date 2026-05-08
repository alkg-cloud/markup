# Chips (G1 Intent Vocabulary)

When a user creates an annotation in the modal, a chip strip above the textarea lets them tag the intent. The chip persists as `Annotation.intentType`.

## The four chips

| Chip | Meaning | Examples |
|---|---|---|
| `visual` | Layout, colour, typography, hierarchy, spacing — anything visual | "this CTA looks like a link, not a button"; "header logo too small"; "card border has insufficient contrast" |
| `copy` | Text content, wording, tone | "rename 'Submit' to 'Continue'"; "this paragraph is too long"; "fix the typo in the subhead" |
| `behavior` | State changes, interactivity, animation, logic | "menu doesn't close on outside click"; "loading spinner missing on submit"; "form validates email but not phone" |
| `other` | Anything that doesn't fit, or the user didn't want to pick | The default. |

The set is intentionally **coarse**. Four buckets are easy to triage — six or more would slow the user down without producing meaningfully better routing.

## UI placement

The chip strip is rendered above the textarea in `AnnotationModal.tsx`:

```
┌────────────────────────────────────────┐
│  [annotated screenshot canvas]         │
│                                        │
├────────────────────────────────────────┤
│  [ visual ]  [ copy ]  [ behavior ]    │
│  [ other ]                             │
│                                        │
│  What's wrong / what to change?        │
│  ┌────────────────────────────────┐    │
│  │                                │    │
│  └────────────────────────────────┘    │
│                                        │
│            [Cancel]  [Save annotation] │
└────────────────────────────────────────┘
```

- Single-select (only one chip can be active)
- Default selection is `other` — chosen explicitly to make "I didn't pick" indistinguishable from "I picked other"
- The active chip is highlighted in `var(--accent)`; inactive chips use a ghost border style

## Persistence

The chip is sent in the `POST /annotations` multipart body as `intent_type`:

```ts
fd.set('intent_type', intentType);
```

The route validates the value against the allowlist:

```ts
const VALID_INTENTS = ['visual', 'copy', 'behavior', 'other'] as const;
if (!VALID_INTENTS.includes(intentRaw as IntentType)) {
  return NextResponse.json({ error: 'invalid_intent_type' }, { status: 400 });
}
```

The annotation row's `intentType` column is `String NOT NULL DEFAULT 'other'` (see [Schema](../data/schema.md)). Defaulting at the DB level means that even if the route layer is bypassed (a future internal caller), the field is never null.

## Display

The annotation detail page (`src/app/annotations/[id]/page.tsx`) shows the chip as a small pill next to the timestamp:

```
Annotation by Alexandre Camillo · USER · VISUAL · 5/8/2026, 2:43 PM
```

The pill colours match the chip strip's active state:

| Chip | Pill bg | Pill fg |
|---|---|---|
| `visual` | `oklch(74.4% 0.193 165 / 0.18)` | `var(--accent-bright)` |
| `copy` | `var(--info-soft)` | `var(--info)` |
| `behavior` | `var(--warning-soft)` | `var(--warning)` |
| `other` | `var(--bg-elevated)` | `var(--text-dim)` |

## Why coarse

Looking at typical comments observed during dogfooding:

- "the contrast on this paragraph is wrong" → `visual`
- "the cards in column 02 collide with their numbers" → `visual`
- "rename Sign in → Log in" → `copy`
- "search doesn't trigger on Enter" → `behavior`

A finer taxonomy (`layout`, `color`, `typography`, `state`, `validation`, …) gets over-granular fast — users hesitate, agents don't gain enough from the discrimination, and the chips strip doubles in size on the screen.

The coarse vocabulary also matches how product teams typically split work: a designer handles `visual`, a copywriter handles `copy`, an engineer handles `behavior`. `other` is the catch-all for cross-cutting concerns or genuine "I'm not sure what category this is".

## Future evolution

Item #20 in `docs/future-features.md` proposes **G2 — LLM-derived intent classification**. When G2 ships:

- The chip stays as the user's explicit signal (cheap, deterministic, free)
- G2 runs in parallel and emits a richer payload to `Annotation.aiIntent` JSON column with finer-grained tags + severity + suggested target selector
- Agent inbox routing (item #22) keys off the union of `intentType` (manual) and `aiIntent.tags` (auto)

The G1 vocabulary is the seed. Once #22 ships, agents declare `specialties: ['design', 'typography']` and the inbox returns annotations whose `intentType` or `aiIntent.tags` overlaps. The four chips map cleanly:

- `visual` → `design`, `typography`, `layout`, `color`, `hierarchy`
- `copy` → `copy`, `tone`, `i18n`
- `behavior` → `engineer`, `state`, `interaction`, `validation`
- `other` → fallback to all-agents pool

## What if the user wants to add a chip?

Don't. The vocabulary is closed. If the four buckets feel insufficient, the right move is to:

1. Document the gap in `docs/future-features.md` (which kinds of comments don't fit any chip)
2. Either widen `other` semantically or commit to the G2 LLM path

Adding a fifth chip without backing data invites bikeshedding and makes the existing four less informative.
