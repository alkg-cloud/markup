'use client';

import { type RefObject, useCallback, useRef } from 'react';
import styles from './ViewportHandles.module.css';
import { VIEWPORT_MIN_HEIGHT, VIEWPORT_MIN_WIDTH, type ViewportState } from './viewport-presets';

export interface ViewportHandlesProps {
  viewport: ViewportState;
  setViewport: (next: ViewportState) => void;
  /** The canvas wrapper around the iframe — used to compute drag bounds. */
  canvasRef: RefObject<HTMLDivElement | null>;
  /** Visual scale applied to the iframe (auto-fit × zoom). Pointer-move
   *  deltas come in screen px; we divide by this so the iframe DOM grows
   *  by the equivalent number of DOM px under the cursor. Defaults to 1. */
  dragScale?: number;
  /** Iframe DOM width at which the visual fills the canvas — drag can
   *  grow up to this OR up to the current width, whichever is larger.
   *  Past this point the iframe is in auto-fit cap and growing further
   *  via drag wouldn't move the handle visually. Numeric input still
   *  unbounded above (visual stays capped, mockup sees the larger
   *  viewport). Optional — defaults to a 4K sanity cap. */
  maxFitW?: number;
  maxFitH?: number;
}

/** Absolute sanity cap (≈4K) used when no canvas-fit bound is provided. */
const DRAG_MAX = 4096;

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

export function ViewportHandles({
  viewport,
  setViewport,
  canvasRef,
  dragScale = 1,
  maxFitW,
  maxFitH,
}: ViewportHandlesProps) {
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
      // Clamp drag-grow to the canvas-fit limit OR the current size,
      // whichever is larger. Once past fit-limit the iframe visual is
      // capped; growing the DOM further wouldn't move the handle, so
      // we lock it. Drag-shrink stays available down to MIN. Numeric
      // input is the only way to push past these caps.
      const fitCapW = maxFitW && maxFitW > 0 ? maxFitW : DRAG_MAX;
      const fitCapH = maxFitH && maxFitH > 0 ? maxFitH : DRAG_MAX;
      dragRef.current = {
        axis,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startW: viewport.width,
        startH: viewport.height,
        boundsW: Math.max(viewport.width, fitCapW),
        boundsH: Math.max(viewport.height, fitCapH),
      };
      // Capture the scale at drag-start so a fitScale change mid-drag
      // (we resize the iframe DOM, which can shrink the auto-fit factor)
      // doesn't make the pointer ratio jitter.
      const scaleAtDragStart = dragScale || 1;

      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = (ev.clientX - d.startClientX) / scaleAtDragStart;
        const dy = (ev.clientY - d.startClientY) / scaleAtDragStart;
        const nextW = d.axis === 'y' ? d.startW : clampW(d.startW + dx, d.boundsW);
        const nextH = d.axis === 'x' ? d.startH : clampH(d.startH + dy, d.boundsH);
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
    [canvasRef, viewport, setViewport, dragScale, maxFitW, maxFitH],
  );

  const onKeyDown = useCallback(
    (axis: Axis) => (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (viewport.width === null || viewport.height === null) return;
      // Keyboard nudge uses the same canvas-fit clamp as pointer drag.
      const fitCapW = maxFitW && maxFitW > 0 ? maxFitW : DRAG_MAX;
      const fitCapH = maxFitH && maxFitH > 0 ? maxFitH : DRAG_MAX;
      const boundsW = Math.max(viewport.width, fitCapW);
      const boundsH = Math.max(viewport.height, fitCapH);
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
    [viewport, setViewport, maxFitW, maxFitH],
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
