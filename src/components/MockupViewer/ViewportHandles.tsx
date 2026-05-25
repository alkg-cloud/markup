'use client';

import { type RefObject, useCallback, useRef } from 'react';
import styles from './ViewportHandles.module.css';
import { VIEWPORT_MIN_HEIGHT, VIEWPORT_MIN_WIDTH, type ViewportState } from './viewport-presets';

export interface ViewportHandlesProps {
  viewport: ViewportState;
  setViewport: (next: ViewportState) => void;
  /** The canvas wrapper around the iframe — used to compute drag bounds. */
  canvasRef: RefObject<HTMLDivElement | null>;
}

type Axis = 'x' | 'y' | 'xy';

interface DragState {
  axis: Axis;
  startClientX: number;
  startClientY: number;
  startW: number;
  startH: number;
  boundsW: number;
  boundsH: number;
}

const NUDGE_STEP = 8;
const NUDGE_STEP_BIG = 32;

function clampW(w: number, bounds: number): number {
  return Math.max(VIEWPORT_MIN_WIDTH, Math.min(bounds, Math.round(w)));
}
function clampH(h: number, bounds: number): number {
  return Math.max(VIEWPORT_MIN_HEIGHT, Math.min(bounds, Math.round(h)));
}

export function ViewportHandles({ viewport, setViewport, canvasRef }: ViewportHandlesProps) {
  const dragRef = useRef<DragState | null>(null);
  const grids = useRef<{
    right?: HTMLDivElement;
    bottom?: HTMLDivElement;
    corner?: HTMLDivElement;
  }>({});

  const onPointerDown = useCallback(
    (axis: Axis, handle: HTMLDivElement) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const canvas = canvasRef.current;
      if (!canvas || viewport.width === null || viewport.height === null) return;
      e.preventDefault();
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        /* same-origin iframe edge cases */
      }
      handle.dataset.dragging = 'true';
      const canvasRect = canvas.getBoundingClientRect();
      dragRef.current = {
        axis,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startW: viewport.width,
        startH: viewport.height,
        boundsW: canvasRect.width,
        boundsH: canvasRect.height,
      };

      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const nextW =
          d.axis === 'y' ? d.startW : clampW(d.startW + (ev.clientX - d.startClientX), d.boundsW);
        const nextH =
          d.axis === 'x' ? d.startH : clampH(d.startH + (ev.clientY - d.startClientY), d.boundsH);
        setViewport({ ...viewport, mode: 'custom', width: nextW, height: nextH });
      };
      const onEnd = () => {
        delete handle.dataset.dragging;
        dragRef.current = null;
        try {
          handle.releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onEnd);
        document.removeEventListener('pointercancel', onEnd);
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onEnd);
      document.addEventListener('pointercancel', onEnd);
    },
    [canvasRef, viewport, setViewport],
  );

  const onKeyDown = useCallback(
    (axis: Axis) => (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (viewport.width === null || viewport.height === null) return;
      const canvas = canvasRef.current;
      const rect = canvas ? canvas.getBoundingClientRect() : null;
      const boundsW = rect && rect.width > 0 ? rect.width : Number.POSITIVE_INFINITY;
      const boundsH = rect && rect.height > 0 ? rect.height : Number.POSITIVE_INFINITY;
      const step = e.shiftKey ? NUDGE_STEP_BIG : NUDGE_STEP;
      let w = viewport.width;
      let h = viewport.height;
      let changed = false;
      if (axis === 'x' || axis === 'xy') {
        if (e.key === 'ArrowRight') {
          w += step;
          changed = true;
        }
        if (e.key === 'ArrowLeft') {
          w -= step;
          changed = true;
        }
      }
      if (axis === 'y' || axis === 'xy') {
        if (e.key === 'ArrowDown') {
          h += step;
          changed = true;
        }
        if (e.key === 'ArrowUp') {
          h -= step;
          changed = true;
        }
      }
      if (!changed) return;
      e.preventDefault();
      setViewport({
        ...viewport,
        mode: 'custom',
        width: clampW(w, boundsW),
        height: clampH(h, boundsH),
      });
    },
    [canvasRef, viewport, setViewport],
  );

  if (viewport.mode !== 'custom') return null;

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: resize handle — <hr> is non-interactive; role=separator+tabIndex=0+aria-label are intentional for keyboard resize. */}
      <div
        ref={(el) => {
          if (el) grids.current.right = el;
        }}
        className={`${styles.handle} ${styles.handleRight}`}
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={viewport.width ?? 0}
        aria-label="Resize viewport width — Arrow keys nudge"
        tabIndex={0}
        onPointerDown={(e) => {
          const el = grids.current.right;
          if (el) onPointerDown('x', el)(e);
        }}
        onKeyDown={onKeyDown('x')}
      >
        <svg
          className={styles.grip}
          viewBox="0 0 4 14"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="2" cy="2" r="1" />
          <circle cx="2" cy="7" r="1" />
          <circle cx="2" cy="12" r="1" />
        </svg>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: resize handle — <hr> is non-interactive; role=separator+tabIndex=0+aria-label are intentional for keyboard resize. */}
      <div
        ref={(el) => {
          if (el) grids.current.bottom = el;
        }}
        className={`${styles.handle} ${styles.handleBottom}`}
        role="separator"
        aria-orientation="horizontal"
        aria-valuenow={viewport.height ?? 0}
        aria-label="Resize viewport height — Arrow keys nudge"
        tabIndex={0}
        onPointerDown={(e) => {
          const el = grids.current.bottom;
          if (el) onPointerDown('y', el)(e);
        }}
        onKeyDown={onKeyDown('y')}
      >
        <svg
          className={styles.grip}
          viewBox="0 0 14 4"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="2" cy="2" r="1" />
          <circle cx="7" cy="2" r="1" />
          <circle cx="12" cy="2" r="1" />
        </svg>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: resize handle — <hr> is non-interactive; role=separator+tabIndex=0+aria-label are intentional for keyboard resize. */}
      <div
        ref={(el) => {
          if (el) grids.current.corner = el;
        }}
        className={`${styles.handle} ${styles.handleCorner}`}
        role="separator"
        aria-valuenow={viewport.width ?? 0}
        aria-label="Resize viewport width and height — Arrow keys nudge"
        tabIndex={0}
        onPointerDown={(e) => {
          const el = grids.current.corner;
          if (el) onPointerDown('xy', el)(e);
        }}
        onKeyDown={onKeyDown('xy')}
      >
        <svg
          className={styles.grip}
          viewBox="0 0 10 10"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M2 9 L9 2 M4.5 9 L9 4.5 M7 9 L9 7" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
}
