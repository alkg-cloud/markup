'use client';
import { type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { VscPinned } from 'react-icons/vsc';
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
  /** Token whose change clears the rail's dragged position so it returns
   *  to the spec-default coordinates. Fullscreen toggles change the
   *  containing block's bounds, which can leave the rail off-screen if
   *  it was previously dragged; bumping this key resets the layout. */
  resetPositionKey?: string | number;
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
  resetPositionKey,
}: AnnotationsRailProps) {
  const railRef = useRef<HTMLElement | null>(null);
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [drag, setDrag] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  // Reset the dragged position when the parent bumps the key (e.g. on
  // fullscreen toggle). This avoids the rail being stranded off-screen
  // when the containing block's bounds change underneath it.
  useEffect(() => {
    setPos(null);
  }, [resetPositionKey]);

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
      // Clamp in screen coordinates so bounds.left/right are directly usable.
      const minLeft = (bounds?.left ?? 0) + 8;
      const minTop = (bounds?.top ?? 0) + 8;
      const maxLeft = (bounds?.right ?? window.innerWidth) - r.width - 8;
      const maxTop = (bounds?.bottom ?? window.innerHeight) - r.height - 8;
      const screenLeft = Math.max(minLeft, Math.min(maxLeft, s.ox + (e.clientX - s.sx)));
      const screenTop = Math.max(minTop, Math.min(maxTop, s.oy + (e.clientY - s.sy)));
      // The rail is `position: absolute` inside its containing block (the
      // AppMain inner div); convert the screen target to container-relative
      // coords so the inline `left/top` style lands the rail on-screen
      // where the cursor actually is.
      setPos({
        left: screenLeft - (bounds?.left ?? 0),
        top: screenTop - (bounds?.top ?? 0),
      });
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

      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover-expand is
          progressive enhancement; keyboard users tab into the buttons directly. */}
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

      {/* biome-ignore lint/a11y/noStaticElementInteractions: see comment above. */}
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
            data-tooltip-align="right"
            aria-label={pinned ? 'Unlock' : 'Keep expanded'}
            onClick={() => setPinned((p) => !p)}
          >
            <VscPinned aria-hidden="true" />
          </button>
        </header>
        {badges.length === 0 ? (
          <p className={styles.empty}>No annotations yet — drop a pin to capture feedback.</p>
        ) : (
          <ul className={styles.list}>{children}</ul>
        )}
      </div>

      {/* biome-ignore lint/a11y/noStaticElementInteractions: see comment above. */}
      <div className={styles.foot} onMouseEnter={enter}>
        <button type="button" className={styles.add} aria-label="New annotation" onClick={onCreate}>
          <span className={styles.addIcon} aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="currentColor" aria-label="Plus icon">
              <title>Plus icon</title>
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
