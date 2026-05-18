/**
 * Pin anchoring — runtime positioning.
 *
 * The pin element lives in a `.pin-layer` overlay sibling of the canvas
 * (NOT inside the canvas, so it doesn't scale with the mockup zoom).
 * This module computes the pin's `top`/`left` from its anchor metadata
 * and writes them into the inline style. Two anchor schemes:
 *
 * - **text-anchor**: `{anchorPath, textOffset, subX, subY}` — pin tip
 *   lands on the (subX,subY) sub-position of the addressed character's
 *   rendered rect.
 * - **element-anchor**: `{anchorPath, offsetX, offsetY}` — pin tip
 *   lands on the (offsetX,offsetY) fractional position inside the
 *   anchor element's bbox.
 *
 * Pin size + tip math: a 30×30 pin rotated -45° has its visual tip at
 * (centerX, centerY + 21px) — see anchoring spec §8 "Tip-on-target math".
 *
 * See `docs/superpowers/specs/2026-05-18-pin-anchoring-strategy.md`.
 */

import { resolveAnchor } from './path';
import { type CharPosition, findCharPositionInElement } from './text';

export const PIN_SIZE = 30;
export const PIN_HALF = PIN_SIZE / 2;
/** sqrt(2) * PIN_SIZE / 2, rounded. Distance from element center to
 *  visual tip after -45° rotation of a square. */
export const PIN_TIP_OFFSET_Y = Math.round((PIN_SIZE / 2) * Math.SQRT2);

export interface TextAnchor {
  /** CSS path resolvable inside the canvas root via `resolveAnchor`. */
  path: string;
  textOffset: number;
  subX?: number; // 0..1, defaults to 0.5
  subY?: number; // 0..1, defaults to 0.5
}

export interface ElementAnchor {
  path: string;
  offsetX: number; // 0..1
  offsetY: number; // 0..1
}

export type Anchor = TextAnchor | ElementAnchor;

export function isTextAnchor(a: Anchor): a is TextAnchor {
  return typeof (a as TextAnchor).textOffset === 'number';
}

/**
 * Returns the rendered rect of the character at `(node, offset)`.
 * Expands the Range by 1 char forward, then backward, then falls back
 * to a collapsed (0-width) caret rect so the result always has a
 * meaningful (left, top).
 */
export function getCharRect(node: Text, offset: number): DOMRect {
  const range = (node.ownerDocument ?? document).createRange();
  const len = (node.nodeValue ?? '').length;
  if (offset < len) {
    range.setStart(node, offset);
    range.setEnd(node, offset + 1);
    const r = range.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return r;
  }
  if (offset > 0) {
    range.setStart(node, offset - 1);
    range.setEnd(node, offset);
    const r = range.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return r;
  }
  range.setStart(node, offset);
  range.setEnd(node, offset);
  return range.getBoundingClientRect();
}

/**
 * Compute pin viewport position from an anchor. Returns the (tx, ty)
 * the pin's tip should land on, in coordinates relative to `layerRect`.
 * Returns null if the anchor element can't be resolved.
 *
 * Callers turn `(tx, ty)` into `pin.style.top/left` via:
 *   left = tx - PIN_HALF
 *   top  = ty - PIN_HALF - PIN_TIP_OFFSET_Y
 *
 * When the canvas root lives inside an iframe (cross-document anchoring),
 * pass `frameOrigin` = the host iframe's `getBoundingClientRect()` so the
 * iframe-viewport-relative rects returned by `getBoundingClientRect` /
 * Range get translated into outer-viewport coordinates before subtracting
 * `layerRect` (which is itself outer-viewport relative).
 */
export function computePinTarget(
  canvasRoot: Element,
  layerRect: DOMRect,
  anchor: Anchor,
  frameOrigin?: { left: number; top: number },
): { tx: number; ty: number } | null {
  const el = resolveAnchor(canvasRoot, anchor.path);
  if (!el) return null;
  const ox = frameOrigin?.left ?? 0;
  const oy = frameOrigin?.top ?? 0;

  if (isTextAnchor(anchor)) {
    const pos: CharPosition | null = findCharPositionInElement(el, anchor.textOffset);
    if (!pos) return null;
    const r = getCharRect(pos.node, pos.offset);
    const subX = clamp01(anchor.subX ?? 0.5);
    const subY = clamp01(anchor.subY ?? 0.5);
    return {
      tx: ox + r.left - layerRect.left + subX * r.width,
      ty: oy + r.top - layerRect.top + subY * r.height,
    };
  }

  const aRect = el.getBoundingClientRect();
  return {
    tx: ox + aRect.left - layerRect.left + anchor.offsetX * aRect.width,
    ty: oy + aRect.top - layerRect.top + anchor.offsetY * aRect.height,
  };
}

/**
 * Apply the computed target as inline `top`/`left` styles so the
 * pin's TIP lands on (tx, ty). Pin is centered horizontally, offset
 * upward so its rotated-corner tip points at the target.
 */
export function applyPinPosition(pin: HTMLElement, target: { tx: number; ty: number }): void {
  pin.style.left = `${target.tx - PIN_HALF}px`;
  pin.style.top = `${target.ty - PIN_HALF - PIN_TIP_OFFSET_Y}px`;
}

function clamp01(n: number): number {
  // Allow slight overflow (subX=-0.1 places pin just outside the char
  // left edge) — the spec permits 0..1 ± a little for flexibility.
  return Number.isFinite(n) ? n : 0.5;
}
