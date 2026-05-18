/**
 * Pin anchoring — React hook.
 *
 * Wires the reposition runtime to layout-affecting events:
 * - ResizeObserver on the canvas root + pin-layer (viewport, sidebar
 *   toggles, content reflow)
 * - fullscreenchange (+ delayed checkpoints at 50ms and 250ms for
 *   browsers that settle layout over several frames)
 * - window load (initial render)
 *
 * `rAF` is intentionally NOT used — it doesn't fire in hidden tabs
 * (Chrome aggressively throttles) and lags one frame in visible tabs,
 * which surfaces as a "first action skipped" bug. Synchronous calls
 * trigger forced layout via getBoundingClientRect, which is correct.
 *
 * See `docs/superpowers/specs/2026-05-18-pin-anchoring-strategy.md` §
 * "When to recompute".
 */

import { type RefObject, useCallback, useEffect } from 'react';
import {
  type Anchor,
  applyPinPosition,
  computePinTarget,
} from './reposition';

export interface UseAnchoredPinsOptions {
  /** Canvas root — the element queries resolve against. */
  canvasRootRef: RefObject<Element | null>;
  /** Pin layer — overlay where pins live. */
  pinLayerRef: RefObject<HTMLElement | null>;
  /**
   * Function the consumer provides so the hook can iterate over every
   * pin element + its anchor data. Each item is `[el, anchor]`.
   */
  getPins: () => Iterable<[HTMLElement, Anchor]>;
}

export interface UseAnchoredPinsApi {
  /** Reposition all pins immediately (synchronous, no rAF). */
  repositionAll: () => void;
}

/**
 * Hook that keeps every pin's `top/left` in sync with its anchor.
 * Returns an imperative `repositionAll` so callers can trigger a
 * recompute on events the hook doesn't know about (e.g. user changes
 * a zoom level — call `repositionAll` synchronously right after the
 * style change).
 */
export function useAnchoredPins(opts: UseAnchoredPinsOptions): UseAnchoredPinsApi {
  const { canvasRootRef, pinLayerRef, getPins } = opts;

  const repositionAll = useCallback(() => {
    const canvas = canvasRootRef.current;
    const layer = pinLayerRef.current;
    if (!canvas || !layer) return;
    const layerRect = layer.getBoundingClientRect();
    for (const [pin, anchor] of getPins()) {
      const target = computePinTarget(canvas, layerRect, anchor);
      if (!target) continue;
      applyPinPosition(pin, target);
    }
  }, [canvasRootRef, pinLayerRef, getPins]);

  useEffect(() => {
    repositionAll();
    if (typeof window === 'undefined') return;
    const canvas = canvasRootRef.current;
    const layer = pinLayerRef.current;

    // ResizeObserver catches layout-driven changes (viewport, fullscreen,
    // sidebar collapse, panel resize, etc.).
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined' && canvas && layer) {
      ro = new ResizeObserver(() => repositionAll());
      ro.observe(canvas);
      ro.observe(layer);
    }

    // Fullscreen transitions take multiple frames to fully settle.
    // Schedule reposition immediately + at +50ms + +250ms to catch
    // whichever frame the layout actually lands on.
    const onFsChange = () => {
      repositionAll();
      window.setTimeout(repositionAll, 50);
      window.setTimeout(repositionAll, 250);
    };
    document.addEventListener('fullscreenchange', onFsChange);

    // Plain window resize as a belt-and-braces signal.
    window.addEventListener('resize', repositionAll);
    window.addEventListener('load', repositionAll);

    return () => {
      ro?.disconnect();
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('resize', repositionAll);
      window.removeEventListener('load', repositionAll);
    };
  }, [canvasRootRef, pinLayerRef, repositionAll]);

  return { repositionAll };
}
