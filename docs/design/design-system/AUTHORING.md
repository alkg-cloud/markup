# Design System Component Authoring Guide

> **Mandated by [CLAUDE.md](../../../CLAUDE.md) "DS authoring rule (STRICT)".** Every file under `docs/design/design-system/*.html` is added or modified per this guide. Read end-to-end before touching any DS file. No exceptions.

## What a DS file is

A DS file is the **contract between design and implementation** for one user-visible surface (a component, a sub-component, or a page-level composition). When the implementer reads it, they should be able to:

1. **See the canonical visual** at the exact tokens that will ship.
2. **Read the React code** they are going to write — anchored to the Radix primitives the project actually uses.
3. **Tell which APIs are stock-Radix and which are custom** without guessing.

If a DS file fails any of those three, it is broken.

A DS file is **not**:

- a buffet of variants for the design team to pick from (that is an **ideia** mockup, lives at `docs/design/ideias/`).
- a redesign canvas (changes to behaviour must be approved on an ideia first; see the [Design pipeline rule](../../../CLAUDE.md)).
- a freestanding spec — it pairs with the React component(s) it represents under `src/components/<Pascal>/`.

## File location and naming

- Path: `docs/design/design-system/NN-<slug>.html`.
- `NN`: zero-padded sequence number (`01`, `02`, …). New files claim the next free number; never renumber existing files.
- `slug`: kebab-case, matches the React component slug at `src/components/<Pascal>/` (e.g. `27-alert-banner.html` ↔ `src/components/AlertBanner/`). Page-level DS files use the route or feature slug (e.g. `11-mockup-view`, `21-invites`).
- Self-contained `.html`: opens in any modern browser without serving. No build step, no `<script src=…>` to local files, no CSS imports beyond Google Fonts.

## Mandatory file skeleton

Every DS file conforms to this skeleton. Sections marked **REQUIRED** appear in every file; sections marked **CONDITIONAL** appear when the rule below them is met.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>NN — <Component name></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    /* REQUIRED — :root tokens copied verbatim from src/styles/tokens.css */
    :root { … }

    /* REQUIRED — prefers-reduced-motion override (zeros motion tokens) */
    @media (prefers-reduced-motion: reduce) { … }

    /* REQUIRED — reset + base body (background, font-family, font-smoothing,
                  the radial-gradient atmosphere) */
    *, *::before, *::after { … }
    body { … }

    /* REQUIRED — page chrome utilities:
       .page, .h1, .lede, .section, .section-title, .stage, .caption */
    …

    /* REQUIRED — the actual component CSS (single recipe with state variants
                  via [data-state] or [data-status] on the wrapper) */
    .<component> { … }
    .<component>[data-state="error"] { … }

    /* REQUIRED — demo helpers used by the sections:
       .row-states, .state, .state .state-label  (all-states grid)
       dl.tokens                                  (anatomy)
       table.matrix                                (state matrix, when-to-use)
       pre.api with .k / .s / .c / .t              (React API syntax) */
    …
  </style>
</head>
<body>

<div class="page" data-ds-component="<slug>">   <!-- REQUIRED marker -->

  <h1 class="h1">Component name</h1>          <!-- REQUIRED title -->
  <p class="lede">…</p>                        <!-- REQUIRED lede, cross-links to siblings -->

  <!-- REQUIRED: All states grid -->
  <section class="section">
    <div class="section-title">All states</div>
    <div class="stage">
      <div class="row-states">
        <div class="state">
          <div class="state-label">Default</div>
          <!-- specimen -->
        </div>
        <!-- one per state -->
      </div>
    </div>
    <div class="caption">…</div>
  </section>

  <!-- CONDITIONAL: per-state deep dive — one section per non-trivial state -->
  <section class="section">
    <div class="section-title">Error state — …</div>
    <div class="stage">…</div>
    <div class="caption">…</div>
  </section>

  <!-- CONDITIONAL: In-context preview — when the component composes into a
       larger surface (form, dialog body, app shell) -->
  <section class="section">
    <div class="section-title">In context — …</div>
    <div class="stage">…</div>
    <div class="caption">…</div>
  </section>

  <!-- REQUIRED: React API section — shows the Radix primitive (if any) and
       the project-specific composition. Honest about what is custom. -->
  <section class="section">
    <div class="section-title">React API — …</div>
    <p>…</p>
    <pre class="api">…</pre>
    <ul>…</ul>
  </section>

  <!-- CONDITIONAL: State decision matrix — required when ≥3 states -->
  <section class="section">
    <div class="section-title">State decision matrix</div>
    <table class="matrix">…</table>
  </section>

  <!-- CONDITIONAL: When-to-use vs sibling components — required when a
       near-sibling DS file exists (e.g. banner vs field-error, dialog vs
       alert-dialog) -->
  <section class="section">
    <div class="section-title">When to use which</div>
    <table class="matrix">…</table>
  </section>

  <!-- REQUIRED: Anatomy — exact tokens -->
  <section class="section">
    <div class="section-title">Anatomy</div>
    <dl class="tokens">…</dl>
  </section>

  <!-- REQUIRED: Behavior — bullet list of runtime contract -->
  <section class="section">
    <div class="section-title">Behavior</div>
    <ul>…</ul>
  </section>

</div>

<!-- OPTIONAL — IIFE script for interactive demos (replay buttons, popover
     toggles). Always wrapped in (function(){ … })(). Never globals. -->
<script>
(function(){ … })();
</script>

</body>
</html>
```

## Tokens

- The `:root` block is copied **verbatim** from `src/styles/tokens.css`. If `tokens.css` adds a new token, the DS file may include it; if `tokens.css` doesn't define it, the DS file MUST NOT invent one.
- Body CSS uses `var(--*)` exclusively. **Zero literal colour values outside `:root`.** Hex, rgb, rgba, oklch literals only appear inside the `:root` declaration or inside status-hue parameterisation gradients (see "Status hue parameterisation").
- The `@media (prefers-reduced-motion: reduce)` block zeros every motion-duration custom property:

  ```css
  @media (prefers-reduced-motion: reduce) {
    :root { --motion-fast: 0ms; --motion-base: 0ms; --motion-slow: 0ms; }
  }
  ```

  Animations defined with `animation: name <dur>` therefore become 0ms — no JS guard needed.

## The DS marker

The top-level page wrapper carries `data-ds-component="<slug>"`. Visual-QA tooling, screenshot diffing, and the agent-loop scrapers all rely on this attribute to scope to the relevant subtree.

```html
<div class="page" data-ds-component="alert-banner">
```

One DS marker per file. Never nested.

## Page chrome utilities

Every file declares the same page-chrome helpers. Copy them verbatim from any of the migrated DS files (e.g. `27-alert-banner.html`). They are:

| Class | Role |
|---|---|
| `.page` | Outer wrapper. `padding: 48px 32px 96px; max-width: 920px; margin: 0 auto` |
| `.h1` | Page title. 24px / 700 / -0.015em, `--text-bright` |
| `.lede` | Lead paragraph under the title. 13px, `--text-dim`. Carries cross-links to siblings. |
| `.section` | Each named section. `margin-bottom: 48px` |
| `.section-title` | Section heading. 10px / 700 / 0.12em uppercase, `--text-muted`, mono |
| `.stage` | Specimen container. Diagonal-stripe background, `--border-subtle` border, `--radius-md`, 32 px pad |
| `.caption` | Caption under a `.stage`. 10.5px / 400, `--text-muted`, mono. ALWAYS pairs with a `.stage`. |

Captions are not optional. Every `.stage` is followed by a `.caption` explaining what the specimen demonstrates.

## Required sections (in order)

### 1. All states grid (REQUIRED)

The first content section. Lays out every variant/state of the component side by side in a `.row-states` grid. This is the page's "table of contents" for the visual surface.

```html
<section class="section">
  <div class="section-title">All states</div>
  <div class="stage">
    <div class="row-states">
      <div class="state">
        <div class="state-label">Default</div>
        <!-- specimen -->
      </div>
      <div class="state">
        <div class="state-label">Error</div>
        <!-- specimen with [data-state="error"] -->
      </div>
      <!-- one per state -->
    </div>
  </div>
  <div class="caption">All states share the same recipe; vary only on [data-state].</div>
</section>
```

`.row-states` is a `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))` with 24px gap (mirror from `27-alert-banner.html`). `.state` is a flex column with a mono caps `.state-label` above the specimen.

For page-level DS files (e.g. `11-mockup-view`, `12-project-folder-view`) where the "states" are full layouts, the section may use letter labels (A/B/C/D) on separate `.stage` blocks instead of `.row-states`. See `14-dialog.html` for that pattern.

### 2. Per-state deep dive (CONDITIONAL)

If a state warrants its own showcase — an animation that replays, a popover that opens, an error that shakes — give it a dedicated section. Pair with a replay button if animated:

```html
<section class="section">
  <div class="section-title">Error state — driven by [data-state="error"]</div>
  <div class="stage">
    <div class="field-stack">
      <!-- one or two specimens -->
      <button id="replay-error" type="button" …>Replay error shake</button>
    </div>
  </div>
  <div class="caption">…</div>
</section>
```

The replay button is wired by the IIFE script at the bottom of the file. See `28-input-field.html` for both the markup and the script.

### 3. In-context preview (CONDITIONAL)

When the component composes into a larger surface (a form field inside a dialog, a banner at the top of a sign-up page), show it. Wrap in a `.form-preview` (or equivalent) glass surface so the composition is realistic.

```html
<div class="form-preview">
  <div class="form-title">New mockup</div>
  <div class="alert-banner" data-status="error">…</div>
  <div>
    <div class="field-label">Name</div>
    <input type="text" value="…">
  </div>
</div>
```

See `27-alert-banner.html` for the canonical `.form-preview` rule set.

### 4. React API section (REQUIRED — most important)

Every DS file MUST have a React API section. No exceptions. The implementer must be able to copy the snippet and write working code.

The section has three parts:

**(a) A prose paragraph** stating which Radix primitive backs the component, or stating that it is custom with the `src/components/<Pascal>/` path. Always honest.

> Radix Primitives ships `@radix-ui/react-form` (Root/Field/Label/Control/Message/Submit). It manages validity via the browser's ConstraintValidation API and emits `[data-invalid]` / `[data-valid]` on `Form.Field` when validation state changes. Our DS keys off both `data-invalid` (Radix-driven sync validation) and `data-state="error" | "success"` (consumer-driven for async/server validation).

**(b) A `<pre class="api">` code block** showing the canonical usage. Use the syntax highlighting helper classes:

- `.k` — keyword (purple)
- `.s` — string (teal)
- `.c` — comment (muted italic)
- `.t` — type / component name (orange)

Example:

```html
<pre class="api"><span class="c">// InputField.tsx — composes Radix Form primitives</span>
<span class="k">import</span> * <span class="k">as</span> Form <span class="k">from</span> <span class="s">'@radix-ui/react-form'</span>;

&lt;<span class="t">Form.Root</span> onSubmit={handleSubmit}&gt;
  &lt;<span class="t">Form.Field</span> name=<span class="s">"name"</span> className=<span class="s">"input-field"</span>&gt;
    &lt;<span class="t">Form.Label</span>&gt;Name&lt;/<span class="t">Form.Label</span>&gt;
    &lt;<span class="t">Form.Control</span> asChild&gt;
      &lt;<span class="k">input</span> type=<span class="s">"text"</span> required pattern=<span class="s">"[a-z0-9-]+"</span> /&gt;
    &lt;/<span class="t">Form.Control</span>&gt;
    &lt;<span class="t">Form.Message</span> match=<span class="s">"patternMismatch"</span> className=<span class="s">"help"</span>&gt;
      Use lowercase letters, numbers, or hyphens only.
    &lt;/<span class="t">Form.Message</span>&gt;
  &lt;/<span class="t">Form.Field</span>&gt;
&lt;/<span class="t">Form.Root</span>&gt;
</pre>
```

Use `&lt;` / `&gt;` (HTML entities) for the JSX angle brackets, NOT raw `<` / `>` — otherwise the browser parses them as elements. Match the indentation of the surrounding `<pre class="api">` block.

**(c) A bulleted "notes" list** explaining slot patterns, error routing, async behaviour, and any custom state that does not exist in Radix.

Custom state flagging: if the DS uses any state Radix does not provide (e.g. `success` on an input where Radix Form only has `data-valid`/`data-invalid`), the bullet MUST say so explicitly:

> Success state ONLY via `[data-state="success"]` — there is no Radix primitive for this. Trigger after async confirmation (debounced).

### 5. State decision matrix (CONDITIONAL — required when ≥3 states)

A table mapping every state to its trigger, visual treatment, and ARIA implication. Use the `table.matrix` helper styles (mirror from `27-alert-banner.html` or `28-input-field.html`):

```html
<table class="matrix">
  <thead>
    <tr><th>State</th><th>How it triggers</th><th>Visual</th><th>Aria</th></tr>
  </thead>
  <tbody>
    <tr><td><code>default</code></td><td>…</td><td>…</td><td>—</td></tr>
    <tr><td><code>error</code></td><td>Radix [data-invalid] OR our [data-state="error"]</td><td>Danger border + ring + shake + ⚠ help</td><td>aria-invalid="true"</td></tr>
    <!-- one per state -->
  </tbody>
</table>
```

Custom-state rows MUST contain the word "(custom)" or "Our `[data-state]`" in the trigger column so the reader can spot the gap.

### 6. When-to-use vs sibling components (CONDITIONAL — required when a near-sibling DS exists)

When two DS components cover overlapping use-cases, both DS files MUST include this matrix. Examples:

- `27-alert-banner` ↔ `28-input-field` (global error vs field error)
- `14-dialog` ↔ `ConfirmDialog` documented inside `14-dialog` (form/info vs destructive)
- `15-popover` ↔ `09-avatar-menu` (popover vs menu)

```html
<table class="matrix">
  <thead>
    <tr><th>Use this component when…</th><th>Use the sibling when…</th></tr>
  </thead>
  <tbody>
    <tr><td>The failure isn't tied to a specific field</td><td>The failure is a constraint of one field</td></tr>
    <!-- one per axis -->
  </tbody>
</table>
```

### 7. Anatomy (REQUIRED)

A `<dl class="tokens">` listing every CSS token, dimension, and animation parameter the component depends on. The mono-caps `<dt>` is the token name, the `<dd>` is the value or rule.

```html
<dl class="tokens">
  <dt>bg<dd>linear-gradient(90deg, oklch(35% 0.14 H / 0.4) 0%, oklch(28% 0.09 H / 0.23) 100%) — H = 25/80/152/200
  <dt>border<dd>1px solid --danger | --warning | --success | --info
  <dt>radius<dd>--radius-sm (8px)
  <dt>padding<dd>10px 14px
  <dt>title<dd>13px / 700, oklch 97% 0.04-0.07 H
  <dt>enter<dd>opacity 0 → 1 + translateY(-4px → 0) over --motion-base / --ease-spring
</dl>
```

The anatomy section is the implementer's quick reference. If a token is in the CSS, it is in the anatomy.

### 8. Behavior (REQUIRED)

A bullet list of the component's runtime contract:

- mount / unmount triggers
- keyboard / mouse / drag interactions
- auto-dismiss rules
- aria-live announcements
- composition behaviour (which child events trigger which parent state)

Example from `27-alert-banner.html`:

- `error` + `warning` dismiss only on explicit close or programmatic unmount — never auto-dismiss.
- `success` + `info` may auto-dismiss; pass `duration` to Root.
- SR announces `error` / `warning` on insertion (`role="alert"`). `success` / `info` use polite `role="status"`.
- Multiple banners stack vertically (gap from parent).
- `Action` button receives focus on mount when present (typical recovery affordance).
- Pairs with `input-field` error state — both can coexist (global banner + per-field flags).

## Visual conventions

### Single recipe with state variants on the wrapper

The component is **one CSS rule** with state variants on the wrapper:

```css
.input-field { /* canonical resting style */ }
.input-field[data-state="error"]   input { border: var(--danger);  /* + shake */ }
.input-field[data-state="success"] input { border: var(--success); /* + ✓     */ }
.input-field[data-invalid] input { /* same as error — Radix-driven */ }
```

Never split a component into `.input-field-error` / `.input-field-success` modifier classes — those hide the relationship. The variant attribute (`[data-state]`, `[data-status]`, `[data-invalid]` from Radix) is the visible diff.

### Status hue parameterisation

For multi-status components (alert-banner, callout, badge, toast) parameterise by hue:

| Status | Hue | Border | Soft bg |
|---|---|---|---|
| `error` | 25 | `--danger` | `--danger-soft` |
| `warning` | 80 | `--warning` | `--warning-soft` |
| `success` | 152 | `--success` | `--success-soft` |
| `info` | 200 | `--info` | `--info-soft` |

The soft gradient surface is `linear-gradient(90deg, oklch(35% 0.14 H / 0.4) 0%, oklch(28% 0.09 H / 0.23) 100%)` with `H` substituted per status. This is the canonical translucent surface — opaque enough for legible text, transparent enough that the parent surface shows through.

### Motion tokens

Always reach for project motion tokens — never hard-code durations:

| Token | Duration | Use |
|---|---|---|
| `--motion-fast` | 160ms | Micro-interactions (border-color, opacity) |
| `--motion-base` | 220ms | Component enter / exit |
| `--motion-slow` | 320ms | Emphasised animations (shake, pop) |

| Token | Easing | Use |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.32, 0.72, 0, 1)` | Most transitions |
| `--ease-spring` | `cubic-bezier(0.5, 1.4, 0.6, 1)` | Overshoot-friendly (banner enter, success pop, error shake) |
| `--ease-exit` | `cubic-bezier(0.32, 0, 0.67, 0)` | Exit-only |

### Animations are state-driven

Animations fire as a side-effect of the state attribute change, never as JS calls:

```css
.input-field[data-state="error"] input {
  animation: errorShake 320ms var(--ease-spring);
}
.input-field[data-state="success"] .trailing-icon {
  animation: successPop 320ms var(--ease-spring);
}
```

Consumer toggles `data-state` → animation plays. To replay, remove and re-apply the attribute (force a reflow with `void el.offsetWidth`). The IIFE script at the bottom of the DS file demonstrates this in the per-state replay buttons.

### Glass-surface standard

For overlays, popovers, dialogs, banners that sit above the page:

```css
background: var(--surface-glass-bg);       /* rgb(7 12 15 / 80%) */
backdrop-filter: blur(16px) saturate(140%);
-webkit-backdrop-filter: blur(16px) saturate(140%);
border: 1px solid var(--border);
```

Scrim layers behind modal dialogs use `var(--scrim-glass-bg)` with the same blur+saturate filter.

### Demo helper classes (mirror across all DS files)

These helpers exist so every DS file looks structurally identical. Copy them verbatim:

- `.row-states` — `display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px`
- `.state` — `display: flex; flex-direction: column; gap: 6px`
- `.state .state-label` — 10px / 700 / 0.1em uppercase, `--text-dim`, mono
- `.field-stack` — `display: flex; flex-direction: column; gap: 16px; max-width: 400px; margin: 0 auto`
- `.form-preview` — glass surface with `padding: 18px; border-radius: 14px`
- `dl.tokens` — `display: grid; grid-template-columns: 200px 1fr; gap: 6px 16px`; `dt` mono accent 11.5px; `dd` text-dim
- `table.matrix` — `border-collapse: collapse; font-size: 12.5px`; `th` muted mono 10.5px caps
- `pre.api` — mono 11.5px / 1.6 line-height, `oklch(8% 0.02 165)` bg, 14×16 padding; classes `.k` `.s` `.c` `.t`

The canonical CSS for these helpers lives in `27-alert-banner.html` and `28-input-field.html`. New files import the same rules — never invent variants.

## Honest Radix posture

Every DS file states explicitly which Radix primitive backs the component, or that none does. The three honest postures:

### (a) Backed by an installed Radix primitive

```text
This component composes @radix-ui/react-dialog (Root/Portal/Overlay/
Content/Title/Close) with @radix-ui/react-form for the body fields.
Both packages are installed.
```

### (b) Would use a Radix primitive — NOT yet installed

For DS files that document a component the project doesn't yet implement, OR where a Radix primitive exists but isn't installed:

```text
@radix-ui/react-tooltip would back this component but is NOT installed.
The current implementation uses a custom popover="hint" + portal. Migrate
when the first consumer needs it.
```

Always include a commented-out hypothetical migration snippet in the `pre.api` block so the path is obvious.

### (c) No Radix primitive available — custom compound

For components Radix deliberately doesn't ship (Button, Input, inline banner, file picker, drag-drop overlay):

```text
Radix Primitives does NOT ship a Button. Use native <button> with the
project's CSS variants (.btn, .btn-secondary, .btn-accent, .btn-danger).
This is the convention in ConfirmDialog.tsx and NewProjectDialog.tsx.
```

### Currently installed Radix primitives

| Package | Used by |
|---|---|
| `@radix-ui/react-alert-dialog` | `useConfirm` hook → destructive confirms |
| `@radix-ui/react-dialog` | `RadixDialog` wrapper → forms / info modals |
| `@radix-ui/react-form` | `InputField`, `NewMockupDialog`, `NewProjectDialog` |
| `@radix-ui/react-slot` | `asChild` slot on `Action`/`Close` everywhere |
| `@radix-ui/react-portal` | `DropOverlay`, future portal mounts |
| `@radix-ui/react-popover` | `FolderPicker` |

### Currently NOT installed (flag in DS, do not install ad-hoc)

- `@radix-ui/react-tooltip`
- `@radix-ui/react-toast`
- `@radix-ui/react-toolbar`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-collapsible`

Install only when the first consumer is being implemented in code, in the same PR. Never install speculatively.

### Things Radix deliberately doesn't ship

The DS makes this clear so the implementer doesn't waste time looking:

- **`Button`** — use native `<button>` with project CSS variants. Documented in `13-buttons.html`.
- **`Input` / `TextField`** — use native `<input>` inside `<Form.Control asChild>`. Documented in `28-input-field.html`.
- **Inline alert / banner** — Radix Toast is the closest, but it's a transient overlay, not an inline notice. The project's `27-alert-banner` is a custom compound that mirrors Radix's API.
- **File picker** — browser-native via hidden `<input type="file">` inside a `<label>`. Documented in `26-empty-state.html`.
- **Drag-drop overlay** — DOM-native drag events; `useDragTarget` + `@radix-ui/react-portal` for the visual.

## Custom-state callout pattern

Any state, prop, or behavior not in Radix MUST be flagged at THREE places in the DS file:

1. **In the state decision matrix** — the trigger column says `"(custom)"` or `"Our [data-state="…"]"`.
2. **In a bullet in the React API section** — explains why Radix doesn't cover it and how the consumer wires it.
3. **In a CSS comment** above the relevant `.component[data-state="…"]` block:

   ```css
   /* SUCCESS — not a Radix primitive: Radix Form's [data-valid] is
      passive (no visual). Use this when you want explicit affirmative
      feedback after an async check. */
   .input-field[data-state="success"] input { … }
   ```

The CSS comment is for the implementer reading the source. The matrix row is for the design reviewer scanning the page. The bullet is for the engineer writing the React.

## Cross-linking conventions

Every DS file cross-links to siblings it composes with or competes with. Two places:

### In the lede

The opening paragraph names siblings inline:

> Composes the canonical <a href="./28-input-field.html"><code>input-field</code></a> for the name field (driving field-level errors) and the <a href="./27-alert-banner.html"><code>alert-banner</code></a> for non-field errors.

Use relative paths (`./NN-name.html`) and `<code>` for the slug.

### In the When-to-use matrix

When two components cover overlapping use-cases, both DS files include a matrix linking to each other.

### When to add a cross-link

| Situation | Cross-link required |
|---|---|
| This component composes / mounts the sibling | Yes — in the lede |
| The sibling is a "use one or the other" alternative | Yes — in the When-to-use matrix |
| The sibling is referenced in the React API snippet | Yes — in the React API section |
| The sibling exists but is unrelated | No |

## Mockup-sync (prod upload)

Per CLAUDE.md "Mockup-sync rule (STRICT)": every DS file change uploads a new version to `markup.alego.cloud/projects/markup-dev/Design System/` in the SAME commit cycle.

```bash
TOKEN=$(cat /workspace/projects/markup/.markup-design/agent-token)
DS_FOLDER=cmp30g0i3000307m6qz2ik193

# Find the mockup ID by exact name match:
MOCKUP_ID=$(curl -s "https://markup.alego.cloud/api/folders/$DS_FOLDER" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print([m['id'] for m in d.get('mockups',[]) if m['name']=='NN-name'][0])")

# Upload new version
cp /workspace/projects/markup/docs/design/design-system/NN-name.html /tmp/index.html
(cd /tmp && rm -f up.zip && zip -q up.zip index.html)
curl -s -X POST "https://markup.alego.cloud/api/mockups/$MOCKUP_ID/version" \
  -H "Authorization: Bearer $TOKEN" \
  -F "build=@/tmp/up.zip;type=application/zip"
```

A new mockup (not a version) is created with `POST /api/mockups` against the same folder ID; do this only when the slug number is new (e.g. introducing `29-…`). Never create new folders/projects without explicit user approval.

## DS cascade

When a DS file changes, the agent identifies which other DS files depend on it and updates them in the same commit:

- A change to `27-alert-banner` → check `25-new-mockup-dialog` (composes the banner). Update if visual drift.
- A change to `13-buttons` → check every dialog that renders buttons; check `14-dialog`'s button section.
- A change to `14-dialog` → check `22-new-invite-dialog`, `07-new-project-dialog`, and any other dialog inheriting the recipe.
- Always: update `docs/design/full-prototype.html` if the change touches a shipping surface.

The dependency map is judgment-based — read the lede / cross-links of each DS file to find consumers.

## Pre-commit checklist

Before committing any DS file:

- [ ] `data-ds-component="<slug>"` marker present on `.page` wrapper.
- [ ] `:root` tokens copied verbatim from `src/styles/tokens.css` (no drift).
- [ ] No literal colour values in body CSS — `var(--*)` only.
- [ ] `@media (prefers-reduced-motion: reduce)` override present.
- [ ] `.page` + `.h1` + `.lede` + sections all present.
- [ ] Lede includes cross-links to sibling DS files where applicable.
- [ ] All states grid (`.row-states` / `.state`) renders every state inline.
- [ ] Per-state deep dive for any animated / interactive state.
- [ ] React API section present with prose + `pre.api` code block + notes bullets.
- [ ] Radix posture explicit (installed / not installed / no primitive).
- [ ] Custom state flagged at all three places (matrix + API bullet + CSS comment).
- [ ] State decision matrix present if ≥3 states.
- [ ] When-to-use matrix present if a near-sibling DS file exists.
- [ ] Anatomy `<dl class="tokens">` lists every token used.
- [ ] Behavior section bullets the runtime contract.
- [ ] Captions under every `.stage`.
- [ ] All cross-links use relative paths and wrap the slug in `<code>`.
- [ ] File opens cleanly in a browser without console errors.
- [ ] New version uploaded to markup.alego.cloud (or new mockup created for a new slug).
- [ ] `docs/feature-catalog.md` updated if a new user-visible surface was added.
- [ ] `docs/frontend/components.md` updated if a new component was added or an existing one was renamed/removed.

## Anti-patterns

Things that break the contract:

### Hard-coded colours outside `:root`

```css
/* WRONG */
.alert-banner { background: rgba(255, 50, 50, 0.4); }

/* RIGHT */
.alert-banner[data-status="error"] {
  background: linear-gradient(90deg, oklch(35% 0.14 25 / 0.4) 0%, …);
}
```

The right version uses the status-hue parameterisation; the left version is a literal that drifts the moment the palette is retuned.

### Multiple files per status / variant

A status variant is the same component with a different `[data-status]`. **One file**.

```text
WRONG: 27a-error-banner.html, 27b-warning-banner.html, …
RIGHT: 27-alert-banner.html with 4 [data-status] variants.
```

### Hiding the React API section

If a consumer can't read the file and write the React, the DS failed. Never omit the React API section, even for "obvious" components.

### Mock data that pretends to be the API

Use placeholder text that's obviously placeholder. The recurring `pricing-v3` mockup name across DS files is intentional — it's the same fake across the whole DS, so readers recognise it as fake.

### Variant chips inside the DS

```html
<!-- WRONG: this is the ideia pattern -->
<button data-knob="status" data-variant="error">error</button>
<button data-knob="status" data-variant="warning">warning</button>
```

The DS file lays variants out side-by-side. Knobs are for ideia mockups (where the design is still being explored).

### Behavior section as "what the CSS does"

```text
WRONG behavior bullets:
- The banner has a gradient background.
- The icon is 28x28 pixels.

RIGHT behavior bullets:
- `error` + `warning` dismiss only on explicit close — never auto-dismiss.
- SR announces `error` on insertion (`role="alert"`).
```

The Anatomy section documents what the CSS does. The Behavior section documents the runtime contract — what triggers what, what announces what, what focuses where.

### "Status: shipped" tombstones

The DS file describes what currently ships. No date stamps, no status bands, no changelog notes. Per CLAUDE.md "Snapshot-only docs" rule. If a state is removed, delete the section. If a token changes, edit it in place.

## Skeleton template

When creating a new DS file from scratch, copy this template. Replace `<slug>` and `Component name`, fill in tokens, then build up sections.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NN — Component name</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{
  /* COPY FROM src/styles/tokens.css — verbatim. Do not edit here. */
}
@media(prefers-reduced-motion:reduce){:root{--motion-fast:0ms;--motion-base:0ms;--motion-slow:0ms}}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{
  background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:14px;line-height:1.5;
  -webkit-font-smoothing:antialiased;
  background-image:
    radial-gradient(ellipse 800px 600px at 70% 20%, oklch(20% 0.1 165 / 0.15), transparent 60%),
    radial-gradient(ellipse 600px 500px at 30% 80%, oklch(15% 0.08 200 / 0.1), transparent 50%);
  background-attachment:fixed;
}
button{cursor:pointer;border:none;background:none;font-family:inherit;color:inherit}
input,textarea,select{font-family:inherit;color:inherit}

/* Page chrome */
.page{padding:48px 32px 96px;max-width:920px;margin:0 auto}
.h1{font-size:24px;font-weight:700;color:var(--text-bright);letter-spacing:-0.015em;margin-bottom:4px}
.lede{font-size:13px;color:var(--text-dim);margin-bottom:32px;max-width:640px}
.section{margin-bottom:48px}
.section-title{font-family:var(--font-mono);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:var(--text-muted);margin-bottom:16px}
.stage{
  position:relative;
  background:repeating-linear-gradient(45deg,oklch(13% 0.025 165) 0 12px,oklch(11% 0.02 165) 12px 24px);
  border:1px solid var(--border-subtle);border-radius:var(--radius-md);
  padding:32px;
}
.stage + .stage{margin-top:16px}
.caption{font-family:var(--font-mono);font-size:10.5px;color:var(--text-muted);margin-top:8px;letter-spacing:0.04em;line-height:1.55}

/* Demo helpers — same across every DS file */
.row-states{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px}
.state{display:flex;flex-direction:column;gap:6px}
.state .state-label{font-family:var(--font-mono);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-dim)}

dl.tokens{display:grid;grid-template-columns:200px 1fr;gap:6px 16px;font-size:12.5px}
dl.tokens dt{font-family:var(--font-mono);color:var(--accent);font-size:11.5px}
dl.tokens dd{color:var(--text-dim)}

table.matrix{width:100%;border-collapse:collapse;font-size:12.5px}
table.matrix th,table.matrix td{padding:8px 12px;text-align:left;border-bottom:1px solid var(--border-subtle);vertical-align:top}
table.matrix th{color:var(--text-muted);font-family:var(--font-mono);font-size:10.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700}
table.matrix code{font-family:var(--font-mono);font-size:11.5px;color:var(--accent)}

pre.api{
  font-family:var(--font-mono);font-size:11.5px;line-height:1.6;
  padding:14px 16px;background:oklch(8% 0.02 165);
  border:1px solid var(--border-subtle);border-radius:var(--radius-sm);
  color:var(--text-dim);overflow-x:auto;white-space:pre;
}
pre.api .k{color:oklch(80% 0.15 280)}
pre.api .s{color:oklch(78% 0.14 165)}
pre.api .c{color:var(--text-muted);font-style:italic}
pre.api .t{color:oklch(86% 0.12 60)}

/* Component CSS goes here — single recipe + state variants */
</style>
</head>
<body>

<div class="page" data-ds-component="<slug>">

  <h1 class="h1">Component name</h1>
  <p class="lede">…</p>

  <section class="section">
    <div class="section-title">All states</div>
    <div class="stage">
      <div class="row-states">
        <div class="state">
          <div class="state-label">Default</div>
          <!-- specimen -->
        </div>
      </div>
    </div>
    <div class="caption">…</div>
  </section>

  <section class="section">
    <div class="section-title">React API — …</div>
    <p>…</p>
    <pre class="api">…</pre>
    <ul>…</ul>
  </section>

  <section class="section">
    <div class="section-title">Anatomy</div>
    <dl class="tokens">
      <dt>…<dd>…
    </dl>
  </section>

  <section class="section">
    <div class="section-title">Behavior</div>
    <ul>
      <li>…</li>
    </ul>
  </section>

</div>

</body>
</html>
```

## Reference implementations

The 28 existing DS files at `docs/design/design-system/*.html` are the canonical source of truth. When in doubt, read three of them:

- **For a simple compound component**: `27-alert-banner.html` (4-status banner, soft gradient, slots).
- **For a stateful primitive composing Radix**: `28-input-field.html` (Radix Form + custom success).
- **For a page-level composition**: `25-new-mockup-dialog.html` (Radix Dialog + Radix Form + InputField + AlertBanner + FolderPicker).

Sample tier-2 (targeted migration), tier-3 (partial restructure), and tier-4 (full rewrite) files for variety:

- Tier-2: `14-dialog.html`, `17-toast.html`, `20-pins.html`
- Tier-3: `07-new-project-dialog.html`, `22-new-invite-dialog.html`
- Tier-4: `13-buttons.html`, `11-mockup-view.html`, `23-invite-signup.html`

## When this guide and an existing DS file disagree

This guide wins. If an existing DS file does not follow the pattern (drift, oversight, future regression), the DS file is wrong — open a migration PR to bring it into compliance.

The reverse is also true: if the pattern needs an extension that no current DS file demonstrates, propose an amendment to this guide BEFORE writing the new DS file. Get explicit user approval; document the amendment in this file in declarative present tense (no changelog band).
