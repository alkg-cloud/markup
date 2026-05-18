'use client';
import { type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import styles from './CanvasToolbar.module.css';
import { nextZoomIndex, ZOOM_DEFAULT_INDEX, ZOOM_STEPS, zoomLabel } from './zoom';

export interface CanvasToolbarProps {
  /** Bounding container used for drag clamping. */
  boundsRef?: RefObject<HTMLElement | null>;
  /** Called whenever the zoom level changes — pass it the new factor. */
  onZoomChange?: (zoom: number) => void;
  /** Called when the user toggles fullscreen — receives the element to
   *  fullscreen. */
  onFullscreenToggle?: () => void;
  /** Whether the element is currently in fullscreen. */
  isFullscreen?: boolean;
  /** Slot for the version chip (rendered after the zoom group). */
  versionChip?: ReactNode;
}

/**
 * Center-bottom floating dock with zoom controls, fullscreen toggle,
 * an optional version chip, and a drag handle.
 *
 * Zoom uses 15 fixed steps (25%..400%). The `%` label resets to 100%
 * when clicked. Reposition of pins happens via the consumer's
 * `onZoomChange` handler — this component owns the index state and
 * dispatches the new factor synchronously.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §5.
 */
export function CanvasToolbar({
  boundsRef,
  onZoomChange,
  onFullscreenToggle,
  isFullscreen,
  versionChip,
}: CanvasToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [zoomIndex, setZoomIndex] = useState(ZOOM_DEFAULT_INDEX);
  const [drag, setDrag] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const changeZoom = useCallback(
    (direction: 1 | -1) => {
      setZoomIndex((idx) => {
        const next = nextZoomIndex(idx, direction);
        if (next !== idx) onZoomChange?.(ZOOM_STEPS[next]);
        return next;
      });
    },
    [onZoomChange],
  );

  const resetZoom = useCallback(() => {
    setZoomIndex(ZOOM_DEFAULT_INDEX);
    onZoomChange?.(ZOOM_STEPS[ZOOM_DEFAULT_INDEX]);
  }, [onZoomChange]);

  // Drag — same shape as the rail. Pointerdown locks to absolute px,
  // pointermove updates clamped to bounds with 8px margin, pointerup
  // releases.
  const dragState = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const onGrabPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const tb = toolbarRef.current;
    if (!tb) return;
    e.preventDefault();
    e.stopPropagation();
    const r = tb.getBoundingClientRect();
    dragState.current = {
      ox: r.left,
      oy: r.top,
      sx: e.clientX,
      sy: e.clientY,
    };
    setDrag(true);
  }, []);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const s = dragState.current;
      const tb = toolbarRef.current;
      if (!s || !tb) return;
      const r = tb.getBoundingClientRect();
      const bounds = boundsRef?.current?.getBoundingClientRect();
      const minLeft = (bounds?.left ?? 0) + 8;
      const minTop = (bounds?.top ?? 0) + 8;
      const maxLeft = (bounds?.right ?? window.innerWidth) - r.width - 8;
      const maxTop = (bounds?.bottom ?? window.innerHeight) - r.height - 8;
      const nextLeft = Math.max(minLeft, Math.min(maxLeft, s.ox + (e.clientX - s.sx)));
      const nextTop = Math.max(minTop, Math.min(maxTop, s.oy + (e.clientY - s.sy)));
      setPos({ left: nextLeft, top: nextTop });
    };
    const onUp = () => {
      setDrag(false);
      dragState.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, boundsRef]);

  const style: React.CSSProperties | undefined = pos
    ? { left: pos.left, top: pos.top, transform: 'none' }
    : undefined;

  return (
    <div
      ref={toolbarRef}
      className={[styles.toolbar, drag && styles.dragging].filter(Boolean).join(' ')}
      style={style}
      role="toolbar"
      aria-label="Mockup actions"
    >
      <div className={styles.group}>
        <button
          type="button"
          className={styles.btn}
          data-tooltip="Zoom out"
          aria-label="Zoom out"
          onClick={() => changeZoom(-1)}
          disabled={zoomIndex === 0}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M4 7h8v2H4z" />
          </svg>
        </button>
        <button
          type="button"
          className={styles.zoomLabel}
          data-tooltip="Reset zoom to 100%"
          aria-label={`Current zoom ${zoomLabel(zoomIndex)} — click to reset`}
          onClick={resetZoom}
        >
          {zoomLabel(zoomIndex)}
        </button>
        <button
          type="button"
          className={styles.btn}
          data-tooltip="Zoom in"
          aria-label="Zoom in"
          onClick={() => changeZoom(1)}
          disabled={zoomIndex === ZOOM_STEPS.length - 1}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M9 4H7v3H4v2h3v3h2V9h3V7H9z" />
          </svg>
        </button>
        <button
          type="button"
          className={[styles.btn, isFullscreen && styles.active].filter(Boolean).join(' ')}
          data-tooltip={isFullscreen ? 'Exit fullscreen (F or Esc)' : 'Fullscreen (F)'}
          aria-label="Toggle fullscreen"
          aria-pressed={isFullscreen ? 'true' : 'false'}
          onClick={onFullscreenToggle}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M3 12h2v1H2v-3h1v2zm10-2h-2v1h1v1h-1v1h2v-3zm-3-7v1h2v2h1V3h-3zm-7 3V4h2V3H2v3h1z" />
          </svg>
        </button>
      </div>

      {versionChip ? <div className={styles.group}>{versionChip}</div> : null}

      <div
        className={styles.grab}
        onPointerDown={onGrabPointerDown}
        data-tooltip="Drag toolbar"
        role="presentation"
      >
        <div className={styles.grabDots} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
