'use client';

import { useEffect, useRef, useState } from 'react';
import { type Anchor, buildAnchorFromClick } from '@/lib/anchoring';

/* ── Iframe wiring for the AppMain viewer ────────────────────────────────
 *
 * The mockup loads in a same-origin iframe; the canvas root is the
 * iframe document's `<html>` after the load event fires. PinLayer +
 * click capture cross the boundary via the cross-document anchoring
 * runtime (`docs/superpowers/specs/2026-05-18-pin-anchoring-strategy.md`).
 *
 * This hook owns:
 *   - the iframe element ref the JSX renders into
 *   - the canvas-root element ref (the iframe's documentElement after load)
 *   - the iframe-generation counter that forces PinLayer to remount and
 *     re-bind after a version switch
 *   - the in-iframe click capture that turns clicks into pending pins
 *     (marking mode) or deactivates the current annotation (idle mode)
 *
 * Returns refs + the generation counter; the caller decides what to do
 * with the resulting clicks via the `marking`, `onPin` and `onMiss`
 * callbacks.
 */
export interface ViewerCanvasHook {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  canvasRootRef: React.MutableRefObject<Element | null>;
  iframeGen: number;
}

export interface ViewerCanvasOptions {
  marking: boolean;
  onPin: (anchor: Anchor) => void;
  onMiss: () => void;
}

export function useViewerCanvas({ marking, onPin, onMiss }: ViewerCanvasOptions): ViewerCanvasHook {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const canvasRootRef = useRef<Element | null>(null);
  // Bumped on iframe load to force PinLayer to remount and re-bind to
  // the new contentDocument's elements after a version switch.
  const [iframeGen, setIframeGen] = useState(0);

  // Bind canvasRootRef whenever the iframe reloads.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      canvasRootRef.current = doc.documentElement;
      setIframeGen((n) => n + 1);
    };
    iframe.addEventListener('load', onLoad);
    if (iframe.contentDocument?.readyState === 'complete') onLoad();
    return () => iframe.removeEventListener('load', onLoad);
  }, []);

  // Click capture inside the iframe.
  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const root = canvasRootRef.current;
    if (!doc || !root) return;
    const onClick = (e: Event) => {
      const me = e as MouseEvent;
      const target = me.target as Element | null;
      if (!target) return;
      if (marking) {
        const anchor = buildAnchorFromClick({
          canvasRoot: root,
          target,
          clientX: me.clientX,
          clientY: me.clientY,
        });
        if (anchor) {
          onPin(anchor);
          e.preventDefault();
          e.stopPropagation();
        }
      } else {
        onMiss();
      }
    };
    doc.addEventListener('click', onClick, true);
    return () => doc.removeEventListener('click', onClick, true);
  }, [marking, iframeGen, onPin, onMiss]);

  return { iframeRef, canvasRootRef, iframeGen };
}
