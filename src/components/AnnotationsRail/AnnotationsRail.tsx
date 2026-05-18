'use client';
import { type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { modSymbol } from '@/lib/shortcuts/platform';
import styles from './AnnotationsRail.module.css';

export interface AnnotationsRailBadge {
  annotationId: string;
  colorIndex: number;
  label: number | string;
}

export interface AnnotationsRailProps {
  /** Bounding container the rail clamps within (typically the AppMain). */
  boundsRef?: RefObject<HTMLElement | null>;
  /** Summary list for collapsed-state badges. The expanded list of full
   *  cards is passed via `children` (so AnnotationCard's data shape can
   *  evolve independently of this component). */
  badges: AnnotationsRailBadge[];
  /** Annotation cards rendered inside the expanded list. */
  children?: ReactNode;
  /** Currently-active annotation. Adds the `.active` class on its badge. */
  activeAnnotationId?: string | null;
  /** Fired when a collapsed badge is clicked. */
  onBadgeClick?: (annotationId: string) => void;
  /** Fired when the "+ New annotation" button is clicked. */
  onCreate?: () => void;
  /** Count badge in the expanded header. Defaults to `badges.length`. */
  count?: number;
}

/**
 * Floating Annotations Rail — left-side panel with collapsed / hover-
 * expanded / pinned-expanded states plus drag-to-reposition.
 *
 * Internal state:
 * - `hover-expanded` (transient) when mouseenter on the body
 * - `pinned-on` (sticky) when the Lock-open button is toggled
 * - `dragging` while the grab handle is held
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §4.
 */
export function AnnotationsRail({
  boundsRef,
  badges,
  children,
  activeAnnotationId,
  onBadgeClick,
  onCreate,
  count,
}: AnnotationsRailProps) {
  const railRef = useRef<HTMLElement | null>(null);
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [drag, setDrag] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Hover-expand: only triggers when the cursor enters the rail body —
  // NOT the drag handle. Each child surface (collapsed, expanded, foot)
  // owns its own mouseenter; the rail body owns mouseleave. The leave
  // handler debounces via a ref so a quick re-enter (gap between
  // sub-regions) cancels the pending collapse instead of leaking it.
  const leaveTimerRef = useRef<number | null>(null);
  const cancelLeave = useCallback(() => {
    if (leaveTimerRef.current !== null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);
  const enter = useCallback(() => {
    cancelLeave();
    if (!pinned) setHover(true);
  }, [pinned, cancelLeave]);
  const leave = useCallback(() => {
    if (pinned) return;
    cancelLeave();
    leaveTimerRef.current = window.setTimeout(() => {
      setHover(false);
      leaveTimerRef.current = null;
    }, 120);
  }, [pinned, cancelLeave]);
  // Cancel any pending leave on unmount so stray timers can't fire
  // setHover on a torn-down component.
  useEffect(() => cancelLeave, [cancelLeave]);

  // Drag handler — pointerdown locks the rail to absolute pixels, then
  // pointermove updates left/top clamped to bounds with 8px margin.
  const dragState = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const onGrabPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!rail) return;
    e.preventDefault();
    e.stopPropagation();
    const r = rail.getBoundingClientRect();
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
      const rail = railRef.current;
      if (!s || !rail) return;
      const r = rail.getBoundingClientRect();
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

  const cls = [
    styles.rail,
    (hover || pinned) && styles.hoverExpanded,
    pinned && styles.pinned,
    drag && styles.dragging,
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties | undefined = pos
    ? { left: pos.left, top: pos.top, transform: 'none' }
    : undefined;

  const visibleCount = count ?? badges.length;
  // Deferred to a client-only effect so the SSR pass renders the
  // generic "Ctrl" symbol and hydration updates it to the OS-correct
  // glyph without a mismatch warning.
  const [shortcutMod, setShortcutMod] = useState('Ctrl');
  useEffect(() => {
    setShortcutMod(modSymbol());
  }, []);
  const newAnnotationShortcut = `${shortcutMod}⇧N`;

  return (
    <aside
      ref={railRef}
      className={cls}
      aria-label="Annotations"
      onMouseLeave={leave}
      style={style}
    >
      <div
        className={styles.grab}
        onPointerDown={onGrabPointerDown}
        data-tooltip="Drag to reposition"
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

      <div className={styles.collapsed} onMouseEnter={enter}>
        {badges.map((b) => (
          <button
            key={b.annotationId}
            type="button"
            className={[styles.badge, activeAnnotationId === b.annotationId && styles.active]
              .filter(Boolean)
              .join(' ')}
            data-color={b.colorIndex}
            data-tooltip={`Open annotation #${String(b.label).padStart(3, '0')}`}
            aria-label={`Open annotation ${b.label}`}
            onClick={() => onBadgeClick?.(b.annotationId)}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className={styles.expanded} onMouseEnter={enter}>
        <header className={styles.head}>
          <div className={styles.headTitle}>
            <span>Annotations</span>
            <span className={styles.count}>{visibleCount}</span>
          </div>
          <button
            type="button"
            className={[styles.lockToggle, pinned && styles.pressed].filter(Boolean).join(' ')}
            aria-pressed={pinned ? 'true' : 'false'}
            data-tooltip={pinned ? 'Unlock' : 'Keep expanded'}
            aria-label={pinned ? 'Unlock' : 'Keep expanded'}
            onClick={() => setPinned((p) => !p)}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M11 4.5V2.5l-.5-.5h-5l-.5.5v2L3 6v2h12V6l-2-1.5zM4 7v-.5L5.5 5l.5-.5V3h4v1.5l.5.5L12 6.5V7H4zm4 1.5v6.5l-1-1V8.5h1z" />
            </svg>
          </button>
        </header>
        {badges.length === 0 ? (
          <p className={styles.empty}>No annotations yet — drop a pin to capture feedback.</p>
        ) : (
          <ul className={styles.list}>{children}</ul>
        )}
      </div>

      <div className={styles.foot} onMouseEnter={enter}>
        <button type="button" className={styles.add} aria-label="New annotation" onClick={onCreate}>
          <span className={styles.addIcon} aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z" />
            </svg>
          </span>
          <span className={styles.addLabel}>
            <span>New annotation</span>
            <span className={styles.shortcut}>{newAnnotationShortcut}</span>
          </span>
        </button>
      </div>
    </aside>
  );
}
