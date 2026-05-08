# Styling

## Token system

Every visual constant is a CSS custom property defined in `src/styles/tokens.css`. Components reference tokens via `var(--…)`; literals are forbidden in production code.

```css
:root {
  /* Surface */
  --bg: oklch(11% 0.03 165);
  --bg-elevated: oklch(15% 0.04 165);
  --bg-card: oklch(13% 0.035 165);

  /* Text */
  --text: oklch(82% 0.04 165);
  --text-bright: oklch(96% 0.02 165);
  --text-dim: oklch(58% 0.04 165);
  --text-muted: oklch(45% 0.04 165);

  /* Accent (teal-leaning green, hue 165° at 74.4% / 0.193) */
  --accent: oklch(74.4% 0.193 165);
  --accent-bright: oklch(82% 0.18 165);

  /* Semantic */
  --info: oklch(70% 0.16 240);
  --info-soft: oklch(70% 0.16 240 / 0.18);
  --success: oklch(72% 0.18 145);
  --warning: oklch(78% 0.16 70);
  --warning-soft: oklch(78% 0.16 70 / 0.18);
  --danger: oklch(64% 0.20 28);

  /* Borders */
  --border: oklch(22% 0.02 165);
  --border-subtle: oklch(18% 0.02 165);
  --border-strong: oklch(28% 0.03 165);

  /* Type */
  --font-body: var(--font-manrope), …;
  --font-display: var(--font-manrope), …;
  --font-mono: var(--font-jetbrains-mono), …;
  --type-2xs: 0.6875rem;
  --type-xs: 0.75rem;
  --type-sm: 0.8125rem;
  --type-base: 0.9375rem;
  --type-md: 1rem;
  --type-lg: 1.125rem;
  --type-xl: 1.5rem;
  --type-2xl: 2rem;
  --type-4xl: 3.5rem;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
  --leading-tight: 1.15;
  --leading-normal: 1.55;
  --tracking-tight: -0.02em;
  --tracking-tighter: -0.04em;
  --tracking-normal: 0;
  --tracking-wide: 0.08em;

  /* Spacing */
  --space-2xs: 4px;
  --space-xs: 6px;
  --space-sm: 12px;
  --space-md: 18px;
  --space-lg: 24px;
  --space-xl: 36px;
  --space-2xl: 56px;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 9999px;

  /* Motion */
  --motion-instant: 80ms;
  --motion-fast: 120ms;
  --motion-base: 180ms;
  --motion-emphasized: 250ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-emphasized: cubic-bezier(0.5, 0, 0, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 0.6);

  /* Focus + selection */
  --focus-ring: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent-bright);
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

## Adding a new token

1. Pick a category (colour, motion, spacing, etc.) — if the value doesn't fit any, add a new category
2. Add the variable to `:root` in `src/styles/tokens.css` with a comment describing its purpose
3. Update the table in this doc if it's a new category
4. Use the token in code

If multiple components use a magic number, that magic number is a missing token.
