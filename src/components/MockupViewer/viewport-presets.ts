/**
 * Single source of truth for the viewport-selector feature: the preset
 * sizes the user can pick from the trigger popover, the discriminated
 * union of modes, and the `ViewportState` shape that `useViewport`
 * owns and `ViewportControl` + `ViewportHandles` consume.
 *
 * Locked from design iteration (see
 * `docs/superpowers/specs/2026-05-25-viewport-selector-spec.md` §User decisions).
 */

export const VIEWPORT_PRESETS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
} as const;

export type ViewportPreset = keyof typeof VIEWPORT_PRESETS;
export type ViewportMode = 'fit' | ViewportPreset | 'custom';
export type Orientation = 'portrait' | 'landscape';

export interface ViewportState {
  mode: ViewportMode;
  /** null when mode === 'fit'; pixels otherwise. */
  width: number | null;
  height: number | null;
  /** Only meaningful for tablet and mobile presets. */
  orientation: Orientation;
}

/** Min iframe size in Custom mode; clamps both drag and numeric input. */
export const VIEWPORT_MIN_WIDTH = 240;
export const VIEWPORT_MIN_HEIGHT = 320;

/** The default state when no localStorage entry exists. */
export const DEFAULT_VIEWPORT: ViewportState = {
  mode: 'fit',
  width: null,
  height: null,
  orientation: 'portrait',
};
