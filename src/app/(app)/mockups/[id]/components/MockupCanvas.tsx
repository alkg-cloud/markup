import type { RefObject } from 'react';
import { AnnotationPin } from '@/components/AnnotationPin/AnnotationPin';
import { computePinScreenPosition, parsePinCoords } from '@/lib/annotation/pin-coords';
import styles from './MockupViewer.module.css';

interface AnnotationSummary {
  id: string;
  threadStatus: string;
  pinCoords: string | null;
}

interface Props {
  mockupId: string;
  mockupName: string;
  currentVersionId: string;
  toolbarZoom: number;
  iframeScroll: { scrollX: number; scrollY: number };
  annotations: AnnotationSummary[];
  iframeRef: RefObject<HTMLIFrameElement | null>;
  iframeWrapRef: RefObject<HTMLDivElement | null>;
}

export function MockupCanvas({
  mockupId,
  mockupName,
  currentVersionId,
  toolbarZoom,
  iframeScroll,
  annotations,
  iframeRef,
  iframeWrapRef,
}: Props) {
  // transform: scale() is applied to the wrapper (not the iframe itself) so
  // pointer events inside the iframe still resolve correctly. iframeWrapRef
  // is also the element handed to requestFullscreen().
  const scaleStyle = {
    transform: `scale(${toolbarZoom / 100})`,
    width: `${(100 * 100) / toolbarZoom}%`,
    height: `${(100 * 100) / toolbarZoom}%`,
  } as const;

  return (
    <div className={styles.canvas}>
      <div ref={iframeWrapRef} className={styles.canvasScale} style={scaleStyle}>
        <iframe
          ref={iframeRef}
          title={mockupName}
          src={`/m/${mockupId}/index.html?v=${currentVersionId}`}
          sandbox="allow-scripts allow-same-origin"
          className={styles.canvasIframe}
        />
        <div className={styles.canvasPinLayer}>
          {annotations.map((a, i) => {
            const pin = parsePinCoords(a.pinCoords);
            if (!pin) return null;
            const pos = computePinScreenPosition(pin, iframeScroll);
            if (!pos.visible) return null;
            return (
              <div key={a.id} className={`pin-wrapper ${styles.canvasPinWrap}`}>
                <AnnotationPin
                  index={i + 1}
                  annotationId={a.id}
                  x={pos.x}
                  y={pos.y}
                  status={a.threadStatus}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
