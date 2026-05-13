# Styling

## Token system

Every visual constant is a CSS custom property defined in `src/styles/tokens.css`. Components reference tokens via `var(--…)`; literals are forbidden in production code.

```css
:root {
  /* Surface — hue 165° teal tint */
  --bg: oklch(11% 0.03 165);
  --bg-elevated: oklch(7% 0.02 165);
  --bg-card: oklch(12% 0.02 165);
  --bg-card-active: oklch(15% 0.025 165);
  --bg-tinted: oklch(9% 0.02 165);

  /* Button surface (hue-neutral grey) */
  --btn-bg: rgb(39, 39, 39);
  --btn-bg-hover: rgb(48, 48, 48);
  --btn-bg-active: rgb(56, 56, 56);
  --surface-hover: rgba(255, 255, 255, 0.04);
  --surface-active: rgba(255, 255, 255, 0.07);

  /* Text */
  --text-bright: oklch(97% 0.01 165);
  --text: oklch(82% 0.04 165);
  --text-dim: oklch(60% 0.02 165);
  --text-muted: oklch(47% 0.02 165);

  /* Accent (teal-leaning green, hue 165° at 74.4% / 0.193) */
  --accent: oklch(74.4% 0.193 165);
  --accent-bright: oklch(82% 0.18 165);
  --accent-soft: oklch(28% 0.08 165);
  --accent-overlay-soft: oklch(74.4% 0.193 165 / 0.18);
  --accent-overlay-mid: oklch(74.4% 0.193 165 / 0.35);

  /* Semantic */
  --success: oklch(76% 0.16 152);
  --success-border: oklch(76% 0.16 152 / 0.25);
  --info: oklch(74% 0.13 200);
  --warning: oklch(80% 0.15 80);
  --warning-border: oklch(80% 0.15 80 / 0.3);
  --danger: oklch(70% 0.2 25);
  --danger-soft: oklch(28% 0.09 25);
  --danger-border: oklch(40% 0.1 25);

  /* Borders */
  --border-subtle: oklch(17% 0.02 165);
  --border: oklch(21% 0.025 165);
  --border-strong: oklch(28% 0.025 165);

  /* Shadows */
  --shadow-sm: 0 2px 6px oklch(0% 0 0 / 0.45);
  --shadow-md: 0 6px 16px oklch(0% 0 0 / 0.5), 0 2px 4px oklch(0% 0 0 / 0.4);
  --shadow-popover: 0 14px 32px oklch(0% 0 0 / 0.6), …;
  --shadow-glow: 0 0 0 1px oklch(74.4% 0.193 165 / 0.4), 0 0 24px oklch(74.4% 0.193 165 / 0.18);
  --scrim-strong: oklch(0% 0 0 / 0.65);

  /* Type */
  --font-body: "Manrope", system-ui, sans-serif;
  --font-display: "Manrope", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", "Menlo", "Consolas", ui-monospace, monospace;
  --type-2xs: 11px; --type-xs: 12px; --type-sm: 13px; --type-base: 14px;
  --type-md: 16px; --type-lg: 20px; --type-xl: 24px; --type-2xl: 32px;
  --type-3xl: 48px; --type-4xl: 64px;
  --weight-medium: 500; --weight-semibold: 600; --weight-bold: 700;
  --leading-tight: 1.1; --leading-normal: 1.5;
  --tracking-tight: -0.015em; --tracking-normal: 0; --tracking-wide: 0.06em;

  /* Spacing */
  --space-2xs: 4px; --space-xs: 8px; --space-sm: 12px; --space-md: 16px;
  --space-lg: 20px; --space-xl: 24px; --space-2xl: 32px;

  /* Radii */
  --radius-xs: 4px; --radius-sm: 8px; --radius-md: 12px;
  --radius-card: 14px; --radius-pill: 9999px;

  /* Motion */
  --motion-instant: 90ms; --motion-fast: 160ms; --motion-base: 220ms;
  --ease-standard: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-spring: cubic-bezier(0.5, 1.4, 0.6, 1);
  --ease-exit: cubic-bezier(0.32, 0, 0.67, 0);

  /* Layout */
  --topbar-height: 52px;
  --sidebar-width: 280px;
  --sidebar-collapsed-width: 52px;

  /* Sidebar pill-morph */
  --pill-width: 84px; --pill-height: 40px;
  --pill-top: 5px; --pill-left: 5px;
  --morph-dur: 360ms; --morph-ease: cubic-bezier(0.4, 0.8, 0.2, 1);

  /* Focus + selection */
  --focus-ring: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent);
  --selection-bg: oklch(74.4% 0.193 165 / 0.32);
}
```

The actual file is the source of truth — this is a snapshot of the categories and conventions, not a copy.

## OKLCH palette + hue 165°

The colour system uses OKLCH instead of HSL/RGB. Why:

- **Perceptually uniform lightness** — `74.4%` is the same perceived brightness across hues, so the accent variants don't read as randomly bright/dark
- **Smaller mental model** — `oklch(L C H / α)` lets you grep for a single L value across the palette to find anything at the same brightness
- **Future hue swap is trivial** — every accent token uses hue `165` (teal-leaning green). To re-skin with a different accent, change the H value in the tokens file

The neutrals are also OKLCH-tinted (chroma ~0.02–0.04 at hue 165°), giving the dark canvas a subtle teal cast that ties to the accent.

## Atmospheric mesh (`globals.css`)

The body uses two radial gradients + a linear tint to mirror grapesjs's atmospheric depth on the near-pure-black canvas. This is fixed-positioned so it doesn't scroll, painted at z-index 0, with `body > *` lifted to z-index 1.

The mesh is intentional; it's why `var(--bg)` alone looks flat in isolation. New surfaces that want a different feel (e.g. the AnnotationModal backdrop) override the bg locally with their own gradient.

## Typography

- **Manrope** for body and display — single typographic family, weights 400–800. Loaded via `next/font/google` in `src/app/layout.tsx`.
- **JetBrains Mono** for code/tabular numerics. Loaded the same way.
- **`.tnum`, `time`, `.tabular`** apply `font-variant-numeric: tabular-nums` — use them for any number that aligns vertically (timestamps, version IDs, counts in tables)

## Focus ring

The global rule wins by specificity over component-level `outline: none`:

```css
:focus { outline: none; }

:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  border-radius: var(--radius-sm);
  transition: box-shadow var(--motion-fast) var(--ease-standard);
}

input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  border-color: var(--accent);
}
```

This means every interactive element gets a focus indicator for keyboard users without per-component CSS. Components that need a different ring (e.g. the AnnotationPin's outer `<a>`) declare their own `:focus-visible` rule with the same `--focus-ring` token.

## Reduced motion policy

Every `@keyframes` rule ships with a matching reduced-motion override in the same module. The global rule in `globals.css` is the safety net:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    /* biome-ignore lint/complexity/noImportantStyles: canonical reduced-motion override */
    animation-duration: 0.001ms !important;
    /* biome-ignore lint/complexity/noImportantStyles: canonical reduced-motion override */
    animation-iteration-count: 1 !important;
    /* biome-ignore lint/complexity/noImportantStyles: canonical reduced-motion override */
    transition-duration: 0.001ms !important;
    /* biome-ignore lint/complexity/noImportantStyles: canonical reduced-motion override */
    scroll-behavior: auto !important;
  }
}
```

The `!important` here is the canonical use — it must defeat any inline `transition: …` set via `style={{}}` regardless of specificity.

## Scrollbars

Thin, accent-tinted thumb on hover. Defined globally in `globals.css`:

```css
* {
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: var(--radius-pill);
  border: 2px solid transparent;
  background-clip: padding-box;
  transition: background var(--motion-fast) var(--ease-standard);
}
*::-webkit-scrollbar-thumb:hover {
  background: oklch(74.4% 0.193 165 / 0.5);
}
```

## Selection

```css
::selection {
  background: var(--selection-bg);
  color: var(--text-bright);
}
```

## CSS Modules

New components use CSS Modules (`.module.css`) instead of inline styles. Existing components that are touched during the UI overhaul migrate to CSS Modules in the same PR. Components outside the current scope keep their inline styles until touched.

```
src/components/CommandPalette/
  CommandPalette.tsx
  CommandPalette.module.css

src/components/Toast/
  Toast.tsx
  Toast.module.css
```

Rules:

1. **New components** — `.module.css` is mandatory
2. **Touched existing components** — migrate inline styles → CSS Modules
3. **Untouched components** — keep inline styles (no drive-by refactors)
4. **Tokens via `var(--token)`** in the module — no hardcoded values
5. **`:hover`, `:focus-visible`, `:active`** live in the module as pseudo-class selectors instead of JS state where possible

```css
/* CommandPalette.module.css */
.backdrop {
  position: fixed;
  inset: 0;
  background: var(--scrim-strong);
  backdrop-filter: blur(8px);
}

.panel {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popover);
}
```

```tsx
import styles from './CommandPalette.module.css';

<div className={styles.backdrop}>
  <div className={styles.panel}>…</div>
</div>
```

## Adding a new token

1. Pick a category (colour, motion, spacing, etc.) — if the value doesn't fit any, add a new category
2. Add the variable to `:root` in `src/styles/tokens.css`
3. Update the snapshot in this doc if it changes a category
4. Use the token in code

If multiple components use a magic number, that magic number is a missing token.
