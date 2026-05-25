'use client';

import { useCallback, useEffect, useRef } from 'react';
import styles from './ViewportHandles.module.css';
import { VIEWPORT_MIN_HEIGHT, VIEWPORT_MIN_WIDTH, type ViewportState } from './viewport-presets';

export interface ViewportHandlesProps {
  viewport: ViewportState;
  setViewport: (next: ViewportState) => void;
  /** Visual scale applied to the iframe (locked-fit × zoom). Pointer-move
   *  deltas come in screen px; we divide by this so the iframe DOM grows
   *  by the equivalent number of DOM px under the cursor. */
  dragScale?: number;
}

const DRAG_MAX = 4096;

type Axis = 'x' | 'y' | 'xy';

interface DragState {
  axis: Axis;
  startClientX: number;
  startClientY: number;
  startW: number;
  startH: number;
  lastW: number;
  lastH: number;
}

const NUDGE_STEP = 8;
const NUDGE_STEP_BIG = 32;

function clampW(w: number): number {
  return Math.max(VIEWPORT_MIN_WIDTH, Math.min(DRAG_MAX, Math.round(w)));
}
function clampH(h: number): number {
  return Math.max(VIEWPORT_MIN_HEIGHT, Math.min(DRAG_MAX, Math.round(h)));
}

export function ViewportHandles({ viewport, setViewport, dragScale = 1 }: ViewportHandlesProps) {
  const dragRef = useRef<DragState | null>(null);
  const grids = useRef<{
    right?: HTMLDivElement;
    bottom?: HTMLDivElement;
    corner?: HTMLDivElement;
  }>({});
  // Force-detach doc-level pointer listeners if the component unmounts
  // mid-drag (e.g. mockup swap, fullscreen toggle remounts the canvas).
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  const onPointerDown = useCallback(
    (axis: Axis, handle: HTMLDivElement) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if (viewport.width === null || viewport.height === null) return;
      e.preventDefault();
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        /* same-origin iframe edge cases */
      }
      handle.dataset.dragging = 'true';
      dragRef.current = {
        axis,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startW: viewport.width,
        startH: viewport.height,
        lastW: viewport.width,
        lastH: viewport.height,
      };
      // Snapshot scale at drag-start — robust against zoom changes mid-drag.
      const scaleAtDragStart = dragScale || 1;

      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = (ev.clientX - d.startClientX) / scaleAtDragStart;
        const dy = (ev.clientY - d.startClientY) / scaleAtDragStart;
        const nextW = d.axis === 'y' ? d.startW : clampW(d.startW + dx);
        const nextH = d.axis === 'x' ? d.startH : clampH(d.startH + dy);
        if (nextW === d.lastW && nextH === d.lastH) return;
        d.lastW = nextW;
        d.lastH = nextH;
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
        cleanupRef.current = null;
      };
      cleanupRef.current = onEnd;
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onEnd);
      document.addEventListener('pointercancel', onEnd);
    },
    [viewport, setViewport, dragScale],
  );

  const onKeyDown = useCallback(
    (axis: Axis) => (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (viewport.width === null || viewport.height === null) return;
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
        width: clampW(w),
        height: clampH(h),
      });
    },
    [viewport, setViewport],
  );

  if (viewport.mode === 'fit') return null;

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
