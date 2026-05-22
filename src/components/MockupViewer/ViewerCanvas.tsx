'use client';

import { memo } from 'react';
import { type PinDescriptor, PinLayer } from '@/components/PinLayer';
import type { Anchor } from '@/lib/anchoring';

interface ViewerCanvasProps {
  mockupSrc: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  canvasRootRef: React.RefObject<Element | null>;
  iframeGen: number;
  /** Whether a draft is active. Drives the canvas cursor (crosshair)
   *  so the user reads the canvas as "click to drop a pin." */
  marking: boolean;
  zoom: number;
  pins: PinDescriptor[];
  draftPins?: Anchor[];
  draftColorIndex?: number;
  removingPinIndex?: number | null;
  onPublishedPinClick: (annotationId: string) => void;
  onDraftPinClick: (pinIndex: number) => void;
  repositionKey: string;
}

/**
 * Iframe + PinLayer pair. Memoized so re-renders driven by draft/rail
 * state in the parent don't re-mount the iframe (which would blow away
 * the loaded mockup) or churn the PinLayer when pins haven't changed.
 */
function ViewerCanvasInner({
  mockupSrc,
  iframeRef,
  canvasRootRef,
  iframeGen,
  marking,
  zoom,
  pins,
  draftPins,
  draftColorIndex,
  removingPinIndex,
  onPublishedPinClick,
  onDraftPinClick,
  repositionKey,
}: ViewerCanvasProps) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'auto',
          cursor: marking ? 'crosshair' : 'default',
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
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        />
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
