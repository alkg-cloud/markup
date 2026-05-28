'use client';

import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { useRef } from 'react';
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
};

export function DemoMockup({ onCanvasClick, children, cursor = 'default', zoom = 1 }: Props) {
  const wrap = useRef<HTMLDivElement>(null);

  function computeClick(clientX: number, clientY: number) {
    if (!onCanvasClick || !wrap.current) return;
    const rect = wrap.current.getBoundingClientRect();
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
      if (!wrap.current) return;
      const rect = wrap.current.getBoundingClientRect();
      computeClick(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }

  return (
    <div
      className={styles.wrap}
      ref={wrap}
      role="application"
      aria-label="Mockup canvas — click to place pins"
      tabIndex={onCanvasClick ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ cursor }}
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
  );
}
