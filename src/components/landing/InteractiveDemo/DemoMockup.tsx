'use client';

import type { CSSProperties, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ViewportHandles } from '@/components/MockupViewer/ViewportHandles';
import type { ViewportState } from '@/components/MockupViewer/viewport-presets';
import { type Anchor, buildAnchorFromClick } from '@/lib/anchoring';
import styles from './DemoMockup.module.css';
import { SAMPLE_HTML } from './sample-mockup.html';

const FIT_MARGIN = 10;

type Props = {
  /** Fired when the user clicks the iframe and a draft pin should drop.
   *  Receives an Anchor object built from the click target — same shape
   *  the product's `<AppMainViewer>` passes to `onCreateAnnotation`. */
  onCanvasClick?: (anchor: Anchor) => void;
  cursor?: CSSProperties['cursor'];
  /** Current zoom from CanvasToolbar (1 = 100%). */
  zoom?: number;
  /** Viewport selector state from CanvasToolbar. */
  viewport: ViewportState;
  setViewport: (next: ViewportState) => void;
  /** Receives the iframe's documentElement once the mockup has loaded.
   *  Parent passes this to `<PinLayer canvasRootRef={...} />` so anchors
   *  resolve against the iframe DOM. */
  canvasRootRef: RefObject<Element | null>;
  /** Bumped after every iframe (re)load so the pin layer's reposition
   *  hook reruns against the fresh document. */
  onIframeLoad?: () => void;
  /** When true, the iframe accepts pointer events so clicks land in the
   *  iframe document and `onCanvasClick` fires. Off by default so the
   *  pin layer + rail capture clicks the way the product does (only the
   *  draft state machine opens the iframe to clicks). */
  iframeClickable?: boolean;
};

function computeFit(
  vw: number | null,
  vh: number | null,
  canvasW: number,
  canvasH: number,
): number {
  if (vw === null || vh === null || canvasW === 0 || canvasH === 0) return 1;
  return Math.min((canvasW - 2 * FIT_MARGIN) / vw, (canvasH - 2 * FIT_MARGIN) / vh, 1);
}

/**
 * DemoMockup mirrors `src/components/MockupViewer/ViewerCanvas.tsx`'s
 * three-layer geometry AND its anchoring model:
 *
 *   wrap (scrollable, --bg-iframe)
 *     └ outer (sized = inner × effectiveScale)
 *         └ inner (natural viewport size, transform: scale)
 *             ├ iframe (allow-same-origin srcDoc — readable DOM, no JS)
 *             └ ViewportHandles (custom-mode resize)
 *
 * Pins are NOT rendered here — they live in a sibling layer (rendered
 * by `<PinLayer>` in DemoStage) so they don't scale with the iframe.
 * The anchoring runtime (`useAnchoredPins`) reads anchor targets out of
 * the iframe's DOM and projects them onto the screen-space pin layer.
 *
 * The iframe uses `sandbox="allow-same-origin"` (no `allow-scripts`):
 * the parent can read its DOM (required for anchoring) but inline
 * scripts in SAMPLE_HTML stay inert — zero XSS surface.
 */
export function DemoMockup({
  onCanvasClick,
  cursor = 'default',
  zoom = 1,
  viewport,
  setViewport,
  canvasRootRef,
  onIframeLoad,
  iframeClickable = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [lockedScale, setLockedScale] = useState(1);
  const prevModeRef = useRef(viewport.mode);
  const isFit = viewport.mode === 'fit';

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setCanvasSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(([entry]) => {
      setCanvasSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Refit on chip selection only — drag-induced preset → custom mid-drag
  // would jump the iframe under the cursor.
  useEffect(() => {
    const prev = prevModeRef.current;
    const curr = viewport.mode;
    prevModeRef.current = curr;
    if (prev === curr) return;
    if (curr === 'custom') return;
    setLockedScale(computeFit(viewport.width, viewport.height, canvasSize.w, canvasSize.h));
  }, [viewport.mode, viewport.width, viewport.height, canvasSize.w, canvasSize.h]);

  useEffect(() => {
    if (canvasSize.w === 0 || canvasSize.h === 0) return;
    setLockedScale(computeFit(viewport.width, viewport.height, canvasSize.w, canvasSize.h));
    // Recompute on canvas-size change only — not on every viewport.width
    // tick (drag).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize.w, canvasSize.h]);

  // Hold the latest `onCanvasClick` in a ref so the iframe-load effect
  // can stay mount-only. Closing over the prop directly would cause the
  // effect to re-fire every render that gave us a new function, which
  // would also re-fire `onIframeLoad` (→ setRepositionKey → re-render →
  // infinite loop, React #185).
  const onCanvasClickRef = useRef(onCanvasClick);
  useEffect(() => {
    onCanvasClickRef.current = onCanvasClick;
  }, [onCanvasClick]);

  // Mount-only: wire iframe load → canvasRootRef + click capture. Click
  // listener reads ref.current so it always sees the freshest handler
  // without re-binding.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function attach() {
      const doc = iframe?.contentDocument;
      if (!doc) return;
      // srcdoc + sandbox="allow-same-origin" — fully readable. The
      // documentElement IS the canvas root (paths resolve from
      // `:scope>body>section>…` against html).
      canvasRootRef.current = doc.documentElement;
      onIframeLoad?.();
      doc.addEventListener('click', handleIframeClick);
    }
    function handleIframeClick(e: Event) {
      const handler = onCanvasClickRef.current;
      if (!handler) return;
      const me = e as MouseEvent;
      // Suppress link navigations and form submits — clicks here mean
      // "drop a pin", not "follow this anchor".
      e.preventDefault();
      e.stopPropagation();
      const target = me.target as Element | null;
      const canvas = canvasRootRef.current;
      if (!canvas || !target) return;
      const anchor = buildAnchorFromClick({
        canvasRoot: canvas,
        target,
        clientX: me.clientX,
        clientY: me.clientY,
      });
      if (anchor) handler(anchor);
    }

    // srcdoc may already be ready by the time React attaches the
    // listener — check both ordering paths.
    if (iframe.contentDocument?.readyState === 'complete') {
      attach();
    } else {
      iframe.addEventListener('load', attach, { once: true });
    }
    return () => {
      const doc = iframe?.contentDocument;
      doc?.removeEventListener('click', handleIframeClick);
      iframe.removeEventListener('load', attach);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  const effectiveScale = lockedScale * zoom;
  const outerW = isFit ? '100%' : `${(viewport.width ?? 0) * effectiveScale}px`;
  const outerH = isFit ? '100%' : `${(viewport.height ?? 0) * effectiveScale}px`;
  const innerW = isFit ? '100%' : `${viewport.width ?? 0}px`;
  const innerH = isFit ? '100%' : `${viewport.height ?? 0}px`;
  const transform = isFit ? `scale(${zoom})` : `scale(${effectiveScale})`;

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      style={{
        display: isFit ? 'block' : 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        cursor,
      }}
    >
      <div
        className={[styles.outer, isFit ? null : styles.outerFramed].filter(Boolean).join(' ')}
        style={{
          width: outerW,
          height: outerH,
          margin: isFit ? 0 : `${FIT_MARGIN}px`,
        }}
      >
        <div
          className={styles.inner}
          style={{ width: innerW, height: innerH, transform, transformOrigin: 'top left' }}
        >
          <iframe
            ref={iframeRef}
            title="Sample mockup"
            srcDoc={SAMPLE_HTML}
            sandbox="allow-same-origin"
            className={styles.iframe}
            style={{ pointerEvents: iframeClickable ? 'auto' : 'none' }}
          />
          <ViewportHandles
            viewport={viewport}
            setViewport={setViewport}
            dragScale={effectiveScale}
          />
        </div>
      </div>
    </div>
  );
}
