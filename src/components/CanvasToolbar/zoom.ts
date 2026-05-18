/**
 * Zoom steps for the CanvasToolbar — 15 fixed levels from 25% to 400%.
 * Reset clicks the % label which returns to index of 1.0.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §5.
 */

export const ZOOM_STEPS = [
  0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4,
] as const;

export const ZOOM_DEFAULT_INDEX = ZOOM_STEPS.indexOf(1);

export function zoomLabel(index: number): string {
  const z = ZOOM_STEPS[index] ?? 1;
  return `${Math.round(z * 100)}%`;
}

export function nextZoomIndex(current: number, direction: 1 | -1): number {
  return Math.max(0, Math.min(ZOOM_STEPS.length - 1, current + direction));
}
