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
 *   - the in-iframe click capture that classifies every click and lets
 *     the parent decide what to do (drop a draft pin / deactivate the
 *     active annotation / open a pin's annotation in the rail).
 *
 * No more marking-mode gate — the parent owns the draft state and
 * decides whether a click should create a pin. The hook just classifies
 * the hit and emits one of:
 *   - `onPin(anchor)` for empty-area clicks that resolved to an anchor
 *   - `onPinClick(click)` for clicks that landed on an existing pin
 *     (draft or published — the parent decides what to do based on kind)
 *   - `onMiss()` for unresolvable clicks (no anchor + not on a pin)
 */
export interface ViewerCanvasHook {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  canvasRootRef: React.MutableRefObject<Element | null>;
  iframeGen: number;
}

export type PinClick =
  | { kind: 'draft'; pinIndex: number }
  | { kind: 'published'; annotationId: string };

export interface ViewerCanvasOptions {
  onPin: (anchor: Anchor) => void;
  onPinClick: (click: PinClick) => void;
  onMiss: () => void;
}

export function useViewerCanvas({
  onPin,
  onPinClick,
  onMiss,
}: ViewerCanvasOptions): ViewerCanvasHook {
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

      // Pin elements are usually rendered in the parent doc overlay
      // (PinLayer), so this branch rarely fires from iframe clicks —
      // but we keep the classification as a defensive dispatcher in
      // case a future pin-in-iframe variant lands.
      const pinElement = (target as HTMLElement).closest?.('[data-pin-id]') as HTMLElement | null;
      if (pinElement) {
        const pinKind = pinElement.dataset.pinKind;
        const pinIndexAttr = pinElement.dataset.pinIndex;
        const annotationId = pinElement.dataset.pinId;
        if (pinKind === 'draft' && pinIndexAttr !== undefined) {
          onPinClick({ kind: 'draft', pinIndex: Number(pinIndexAttr) });
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (pinKind === 'published' && annotationId) {
          onPinClick({ kind: 'published', annotationId });
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

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
      } else {
        onMiss();
      }
    };
    doc.addEventListener('click', onClick, true);
    return () => doc.removeEventListener('click', onClick, true);
  }, [iframeGen, onPin, onPinClick, onMiss]);

  return { iframeRef, canvasRootRef, iframeGen };
}
