'use client';

import { memo } from 'react';
import { type PinDescriptor, PinLayer } from '@/components/PinLayer';

interface ViewerCanvasProps {
  mockupSrc: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  canvasRootRef: React.RefObject<Element | null>;
  iframeGen: number;
  marking: boolean;
  zoom: number;
  pins: PinDescriptor[];
  onPinClick: (annotationId: string) => void;
  repositionKey: string;
}

/**
 * Iframe + PinLayer pair. Memoized so re-renders driven by composer/rail
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
  onPinClick,
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
        onPinClick={onPinClick}
        repositionKey={repositionKey}
      />
    </>
  );
}

export const ViewerCanvas = memo(ViewerCanvasInner);
