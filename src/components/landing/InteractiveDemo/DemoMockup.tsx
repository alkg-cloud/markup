'use client';

import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ViewportHandles } from '@/components/MockupViewer/ViewportHandles';
import type { ViewportState } from '@/components/MockupViewer/viewport-presets';
import styles from './DemoMockup.module.css';
import { SAMPLE_HTML } from './sample-mockup.html';

const FIT_MARGIN = 10;

type Props = {
  onCanvasClick?: (xPct: number, yPct: number) => void;
  /** Pins + draft overlay — rendered INSIDE the scaled inner div so they
   *  follow zoom + viewport changes 1:1 with the iframe (same shape as
   *  the product's `<ViewerCanvas>` mounts `<PinLayer>`). */
  children?: ReactNode;
  cursor?: CSSProperties['cursor'];
  /** Current zoom from CanvasToolbar (1 = 100%). */
  zoom?: number;
  /** Viewport selector state from CanvasToolbar. */
  viewport: ViewportState;
  setViewport: (next: ViewportState) => void;
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
 * DemoMockup mirrors the layered geometry of
 * `src/components/MockupViewer/ViewerCanvas.tsx`:
 *
 *   wrap (scrollable, bg-iframe, click capture)
 *     └ outer (sized = inner × effectiveScale; centered margin in framed mode)
 *         └ inner (natural viewport size, transform: scale(effectiveScale))
 *             ├ iframe (100% × 100%)
 *             ├ pinLayer (absolute, inset 0 — scales with inner)
 *             └ ViewportHandles (custom-mode resize, scale-aware drag)
 *
 * The pin layer is INSIDE the scaled inner so a 20% zoom moves the pins
 * by the same 20% the iframe content moves under them. Click coordinates
 * are computed from the inner's bounding rect, so a click on a visible
 * iframe pixel maps to the natural-size %, not the on-screen %.
 */
export function DemoMockup({
  onCanvasClick,
  children,
  cursor = 'default',
  zoom = 1,
  viewport,
  setViewport,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  // Fit-scale is computed against the wrap size when entering a preset,
  // then locked. Drag-resize (which transitions mode to 'custom') doesn't
  // refit — the wrapper scrolls instead. Identical heuristic to
  // `ViewerCanvas.tsx`.
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

  // Refit on chip selection only (mode change). Drag-induced preset →
  // custom mid-drag would jump the iframe under the cursor.
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
    // Recompute on canvas-size change but NOT on every viewport.width/height
    // tick (drag).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize.w, canvasSize.h]);

  const effectiveScale = lockedScale * zoom;

  // outer wraps the SCALED size (so flex layout in the wrap and scrollbars
  // see the visible footprint). inner is the NATURAL viewport size with
  // transform: scale(effectiveScale) applied — pins + handles compute in
  // natural coords, which keeps cross-product math simple.
  const outerW = isFit ? '100%' : `${(viewport.width ?? 0) * effectiveScale}px`;
  const outerH = isFit ? '100%' : `${(viewport.height ?? 0) * effectiveScale}px`;
  const innerW = isFit ? '100%' : `${viewport.width ?? 0}px`;
  const innerH = isFit ? '100%' : `${viewport.height ?? 0}px`;
  const transform = isFit ? `scale(${zoom})` : `scale(${effectiveScale})`;

  function computeClick(clientX: number, clientY: number) {
    if (!onCanvasClick || !innerRef.current) return;
    const rect = innerRef.current.getBoundingClientRect();
    const xPct = ((clientX - rect.left) / rect.width) * 100;
    const yPct = ((clientY - rect.top) / rect.height) * 100;
    onCanvasClick(xPct, yPct);
  }

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    computeClick(e.clientX, e.clientY);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!innerRef.current) return;
      const rect = innerRef.current.getBoundingClientRect();
      computeClick(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }

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
          ref={innerRef}
          className={styles.inner}
          style={{ width: innerW, height: innerH, transform, transformOrigin: 'top left' }}
          role="application"
          aria-label="Mockup canvas — click to place pins"
          tabIndex={onCanvasClick ? 0 : -1}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          <iframe title="Sample mockup" srcDoc={SAMPLE_HTML} sandbox="" className={styles.iframe} />
          <div className={styles.pinLayer}>{children}</div>
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
