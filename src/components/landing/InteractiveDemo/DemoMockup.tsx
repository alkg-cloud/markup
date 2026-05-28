'use client';

import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { useRef } from 'react';
import type { ViewportState } from '@/components/MockupViewer/viewport-presets';
import styles from './DemoMockup.module.css';
import { SAMPLE_HTML } from './sample-mockup.html';

type Props = {
  onCanvasClick?: (xPct: number, yPct: number) => void;
  children?: ReactNode;
  cursor?: CSSProperties['cursor'];
  /** Zoom factor — applied as `transform: scale(zoom)` on the iframe so
   *  the toolbar's +/-/100% buttons feel live. Pin overlay uses % coords
   *  so its alignment to the wrap doesn't drift with zoom. */
  zoom?: number;
  /** Viewport selector state from CanvasToolbar. `fit` (default) lets the
   *  iframe fill the stage; a preset sizes the iframe to that fixed
   *  device. The pin layer stays on top of the device frame so % coords
   *  still match what the user sees. */
  viewport?: ViewportState;
};

export function DemoMockup({
  onCanvasClick,
  children,
  cursor = 'default',
  zoom = 1,
  viewport,
}: Props) {
  // Ref tracks the .frame (the actual device-sized box) so pin coords are
  // relative to the visible iframe content, not the letterbox negative
  // space around it.
  const frame = useRef<HTMLDivElement>(null);
  const isFit = !viewport || viewport.mode === 'fit';
  // Swap width/height when the user rotates a non-desktop preset. Desktop
  // is treated as landscape regardless of the stored orientation.
  const isRotatable = viewport && viewport.mode !== 'fit' && viewport.mode !== 'desktop';
  const baseW = viewport?.width ?? 0;
  const baseH = viewport?.height ?? 0;
  const landscape = isRotatable && viewport?.orientation === 'landscape';
  const w = landscape ? baseH : baseW;
  const h = landscape ? baseW : baseH;

  function computeClick(clientX: number, clientY: number) {
    if (!onCanvasClick || !frame.current) return;
    const rect = frame.current.getBoundingClientRect();
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
      if (!frame.current) return;
      const rect = frame.current.getBoundingClientRect();
      computeClick(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }

  // Always inline the size so it wins the cascade. Fit fills the stage
  // edge-to-edge; framed presets get fixed px clamped to the stage size.
  const frameStyle: CSSProperties = isFit
    ? { width: '100%', height: '100%' }
    : {
        width: `${w}px`,
        height: `${h}px`,
        maxWidth: '100%',
        maxHeight: '100%',
      };

  return (
    <div
      className={[styles.wrap, isFit ? null : styles.framed].filter(Boolean).join(' ')}
      style={{ cursor }}
    >
      <div
        ref={frame}
        className={styles.frame}
        style={frameStyle}
        role="application"
        aria-label="Mockup canvas — click to place pins"
        tabIndex={onCanvasClick ? 0 : -1}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <iframe
          title="Sample mockup"
          srcDoc={SAMPLE_HTML}
          sandbox=""
          className={styles.iframe}
          style={
            zoom === 1 ? undefined : { transform: `scale(${zoom})`, transformOrigin: 'top left' }
          }
        />
        <div className={styles.pinLayer}>{children}</div>
      </div>
    </div>
  );
}
