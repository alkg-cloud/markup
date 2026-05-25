'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { type PinDescriptor, PinLayer } from '@/components/PinLayer';
import type { Anchor } from '@/lib/anchoring';
import { ViewportHandles } from './ViewportHandles';
import type { ViewportState } from './viewport-presets';

/** Padding around the auto-fit-scaled iframe in non-fit modes — gives the
 *  drag handles a breathing margin so they're never hugging the wrapper
 *  edges. Matches Chrome DevTools' responsive-mode visual layout. */
const FIT_MARGIN = 24;

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
  const isFit = viewport.mode === 'fit';

  // Track wrapper inner size so we can auto-fit-scale the iframe in
  // non-fit modes. The iframe DOM stays at the requested viewport
  // dimensions (so the mockup's media queries see the right viewport),
  // but the visual is scaled down to fit the canvas with a small margin.
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

  // Canvas-fit limit in DOM coords — the iframe DOM width/height at which
  // the visual exactly fills the canvas content area (minus margin). Past
  // this, auto-fit caps the visual and dragging would change the scale
  // without moving the handle. Drag clamp uses these to prevent that.
  const maxFitW = canvasSize.w > 0 ? Math.max(0, canvasSize.w - FIT_MARGIN * 2) : 0;
  const maxFitH = canvasSize.h > 0 ? Math.max(0, canvasSize.h - FIT_MARGIN * 2) : 0;

  const fitScale =
    !isFit && viewport.width !== null && viewport.height !== null && maxFitW > 0 && maxFitH > 0
      ? Math.min(maxFitW / viewport.width, maxFitH / viewport.height, 1)
      : 1;
  const effectiveScale = fitScale * zoom;

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
          padding: isFit ? 0 : `${FIT_MARGIN}px`,
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
          // it correctly and no scrollbars appear when the iframe fits);
          // inner holds the iframe + handles at the requested viewport
          // dimensions and applies the visual scale.
          <div
            style={{
              width: `${(viewport.width ?? 0) * effectiveScale}px`,
              height: `${(viewport.height ?? 0) * effectiveScale}px`,
              flexShrink: 0,
              boxShadow: 'var(--shadow-md)',
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
                maxFitW={maxFitW}
                maxFitH={maxFitH}
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
