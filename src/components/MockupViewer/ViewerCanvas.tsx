'use client';

import { memo, useRef } from 'react';
import { type PinDescriptor, PinLayer } from '@/components/PinLayer';
import type { Anchor } from '@/lib/anchoring';
import { ViewportHandles } from './ViewportHandles';
import type { ViewportState } from './viewport-presets';

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
  const isFit = viewport.mode === 'fit';

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
          // Sized box wraps iframe + handles so the handles pin to the
          // iframe edges (not to the scrollable canvas wrapper, which
          // is much larger when the iframe overflows on big presets).
          <div
            style={{
              position: 'relative',
              width: `${viewport.width}px`,
              height: `${viewport.height}px`,
              flexShrink: 0,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              boxShadow: 'var(--shadow-md)',
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
            <ViewportHandles viewport={viewport} setViewport={setViewport} canvasRef={wrapperRef} />
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
