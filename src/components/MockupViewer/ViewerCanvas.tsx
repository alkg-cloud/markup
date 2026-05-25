'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { type PinDescriptor, PinLayer } from '@/components/PinLayer';
import type { Anchor } from '@/lib/anchoring';
import { ViewportHandles } from './ViewportHandles';
import type { ViewportMode, ViewportState } from './viewport-presets';

/** Distance the iframe keeps from each canvas edge when auto-fitting on
 *  a preset/chip selection. The visible mockup always has this much
 *  breathing room before "touching" the canvas border. */
const FIT_MARGIN = 10;

interface ViewerCanvasProps {
  mockupSrc: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  canvasRootRef: React.RefObject<Element | null>;
  iframeGen: number;
  /** Whether a draft is active. Drives the canvas cursor (crosshair)
   *  so the user reads the canvas as "click to drop a pin." */
  marking: boolean;
  zoom: number;
  viewport: ViewportState;
  setViewport: (next: ViewportState) => void;
  pins: PinDescriptor[];
  draftPins?: Anchor[];
  draftColorIndex?: number;
  removingPinIndex?: number | null;
  onPublishedPinClick: (annotationId: string) => void;
  onDraftPinClick: (pinIndex: number) => void;
  repositionKey: string;
}

const PRESET_MODES: ViewportMode[] = ['desktop', 'tablet', 'mobile'];

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
 * Iframe + PinLayer + ViewportHandles. Memoized so re-renders driven
 * by draft/rail state in the parent don't re-mount the iframe (which
 * would blow away the loaded mockup) or churn the PinLayer when pins
 * haven't changed.
 */
function ViewerCanvasInner({
  mockupSrc,
  iframeRef,
  canvasRootRef,
  iframeGen,
  marking,
  zoom,
  viewport,
  setViewport,
  pins,
  draftPins,
  draftColorIndex,
  removingPinIndex,
  onPublishedPinClick,
  onDraftPinClick,
  repositionKey,
}: ViewerCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  // The fit scale is LOCKED at the moment a preset is selected (or canvas
  // resizes). Subsequent drag/numeric-input changes do NOT recompute it,
  // so the handle follows the cursor 1:1 in screen px and the iframe can
  // overflow the canvas (wrapper scrolls). Initial 1; first ResizeObserver
  // callback recomputes against the actual canvas size.
  const [lockedScale, setLockedScale] = useState(1);
  const prevModeRef = useRef<ViewportMode>(viewport.mode);
  const isFit = viewport.mode === 'fit';

  // Track wrapper inner size for the fit calculation. ResizeObserver
  // fires on window resize, fullscreen toggle, and sidebar collapse.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    setCanvasSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(([entry]) => {
      setCanvasSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Refit on viewport.mode transitions — preset chip clicks. We DO NOT
  // recompute on drag-induced transitions (preset → custom), because the
  // user's intent is to tweak from the preset baseline; reverting to a
  // fresh fit-scale would jump the iframe under their cursor.
  useEffect(() => {
    const prev = prevModeRef.current;
    const curr = viewport.mode;
    prevModeRef.current = curr;
    if (prev === curr) return;
    if (PRESET_MODES.includes(prev) && curr === 'custom') return;
    // viewport.width/height intentionally NOT deps — we read the values
    // that landed in the same render the mode changed (effects run after
    // render). Including them would also re-fire on every drag tick,
    // defeating the lock.
    setLockedScale(computeFit(viewport.width, viewport.height, canvasSize.w, canvasSize.h));
  }, [viewport.mode]);

  // Refit on canvas resize. Same deal — we don't include viewport.width
  // here to avoid firing during drag.
  useEffect(() => {
    if (canvasSize.w === 0 || canvasSize.h === 0) return;
    setLockedScale(computeFit(viewport.width, viewport.height, canvasSize.w, canvasSize.h));
  }, [canvasSize.w, canvasSize.h]);

  const effectiveScale = lockedScale * zoom;

  return (
    <>
      <div
        ref={wrapperRef}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'auto',
          display: isFit ? 'block' : 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          cursor: marking ? 'crosshair' : 'default',
        }}
      >
        {isFit ? (
          <iframe
            ref={iframeRef}
            src={mockupSrc}
            title="Mockup"
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          />
        ) : (
          // Double-wrap: outer takes the SCALED layout box (so flex sizes
          // the iframe by its visual footprint); inner holds the iframe
          // at the requested viewport dimensions and applies the visual
          // scale. Handles live inside the inner box → pinned to iframe
          // edges + scale visually with the iframe.
          <div
            style={{
              width: `${(viewport.width ?? 0) * effectiveScale}px`,
              height: `${(viewport.height ?? 0) * effectiveScale}px`,
              flexShrink: 0,
              boxShadow: 'var(--shadow-md)',
              margin: `${FIT_MARGIN}px`,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: `${viewport.width ?? 0}px`,
                height: `${viewport.height ?? 0}px`,
                transform: `scale(${effectiveScale})`,
                transformOrigin: 'top left',
              }}
            >
              <iframe
                ref={iframeRef}
                src={mockupSrc}
                title="Mockup"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 0,
                  display: 'block',
                }}
              />
              <ViewportHandles
                viewport={viewport}
                setViewport={setViewport}
                canvasRef={wrapperRef}
                dragScale={effectiveScale}
              />
            </div>
          </div>
        )}
      </div>

      <PinLayer
        key={iframeGen}
        canvasRootRef={canvasRootRef}
        pins={pins}
        draftPins={draftPins}
        draftColorIndex={draftColorIndex}
        removingPinIndex={removingPinIndex}
        onPublishedPinClick={onPublishedPinClick}
        onDraftPinClick={onDraftPinClick}
        repositionKey={repositionKey}
      />
    </>
  );
}

export const ViewerCanvas = memo(ViewerCanvasInner);
