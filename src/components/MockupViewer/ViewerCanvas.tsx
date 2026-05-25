'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { type PinDescriptor, PinLayer } from '@/components/PinLayer';
import type { Anchor } from '@/lib/anchoring';
import { ViewportHandles } from './ViewportHandles';
import { VIEWPORT_PRESETS, type ViewportMode, type ViewportState } from './viewport-presets';

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

const PRESET_MODES = Object.keys(VIEWPORT_PRESETS) as ViewportMode[];

function computeFit(
  vw: number | null,
  vh: number | null,
  canvasW: number,
  canvasH: number,
): number {
  if (vw === null || vh === null || canvasW === 0 || canvasH === 0) return 1;
  return Math.min((canvasW - 2 * FIT_MARGIN) / vw, (canvasH - 2 * FIT_MARGIN) / vh, 1);
}

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
  // Fit scale is LOCKED at preset selection (and canvas resize). Drag /
  // numeric-input changes don't recompute it, so handles follow the cursor
  // 1:1 in screen px and the iframe can overflow the canvas (wrapper scrolls).
  const [lockedScale, setLockedScale] = useState(1);
  const prevModeRef = useRef<ViewportMode>(viewport.mode);
  const isFit = viewport.mode === 'fit';

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

  // Refit on chip selection only. Drag-induced preset→custom transitions
  // are skipped — refitting mid-drag would jump the iframe under the cursor.
  // width/height intentionally not deps so this doesn't fire on drag ticks.
  useEffect(() => {
    const prev = prevModeRef.current;
    const curr = viewport.mode;
    prevModeRef.current = curr;
    if (prev === curr) return;
    if (PRESET_MODES.includes(prev) && curr === 'custom') return;
    setLockedScale(computeFit(viewport.width, viewport.height, canvasSize.w, canvasSize.h));
  }, [viewport.mode]);

  useEffect(() => {
    if (canvasSize.w === 0 || canvasSize.h === 0) return;
    setLockedScale(computeFit(viewport.width, viewport.height, canvasSize.w, canvasSize.h));
  }, [canvasSize.w, canvasSize.h]);

  const effectiveScale = lockedScale * zoom;

  // The iframe stays at the same React position regardless of mode —
  // toggling Fit ↔ preset would otherwise remount the iframe (the load
  // listener in useViewerCanvas is `[]`-dep and binds at mount), leaving
  // canvasRootRef bound to a detached document.
  const transform = isFit ? `scale(${zoom})` : `scale(${effectiveScale})`;
  const outerW = isFit ? '100%' : `${(viewport.width ?? 0) * effectiveScale}px`;
  const outerH = isFit ? '100%' : `${(viewport.height ?? 0) * effectiveScale}px`;
  const innerW = isFit ? '100%' : `${viewport.width ?? 0}px`;
  const innerH = isFit ? '100%' : `${viewport.height ?? 0}px`;

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
        <div
          style={{
            width: outerW,
            height: outerH,
            flexShrink: 0,
            boxShadow: isFit ? 'none' : 'var(--shadow-md)',
            margin: isFit ? 0 : `${FIT_MARGIN}px`,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: innerW,
              height: innerH,
              transform,
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
              dragScale={effectiveScale}
            />
          </div>
        </div>
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
