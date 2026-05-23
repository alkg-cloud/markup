'use client';
import { forwardRef, type MouseEvent, type Ref } from 'react';
import styles from './Pin.module.css';

export type PinStatus = 'idle' | 'active' | 'pending';
export type PinKind = 'published' | 'draft';

export interface PinProps {
  /** Stable identifier — exposed as `data-annotation-id` so click delegation
   *  on the pin layer can map back to the annotation. */
  annotationId: string;
  /** Pin kind — `published` for committed annotation pins, `draft` for
   *  pins on the in-flight DraftCard. Surfaces as `data-pin-kind` so the
   *  canvas click classifier (useViewerCanvas) and PinLayer's event
   *  delegation can route clicks to the right handler. */
  kind?: PinKind;
  /** Index of the draft pin inside `draftPins[]`. Only set when
   *  `kind === 'draft'`; surfaces as `data-pin-index`. */
  pinIndex?: number;
  /** Index into the 16-color palette (0..15). */
  colorIndex: number;
  /** Number rendered inside the pin (typically the annotation number). */
  label: number | string;
  /** Visual state. `active` adds the pulsing glow; `pending` renders the
   *  dashed-outline composer-placement variant. */
  status?: PinStatus;
  /** When `true`, the pin fades out (200 ms) and stops receiving pointer
   *  events. Used by PinLayer when a draft pin is queued for removal so
   *  the user sees a visible departure rather than a discontinuous
   *  unmount. */
  removing?: boolean;
  /** Optional human-friendly label used for `aria-label`. Defaults to
   *  `Annotation #001`. Pins intentionally do NOT render a hover tooltip
   *  — the rotated -45° transform on the pin frame made tooltip
   *  positioning flaky and the label adds no usability the rail card
   *  doesn't already cover. */
  tooltip?: string;
  /** Click handler. Receives the synthetic event so callers can stop
   *  propagation if needed. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Forwarded ref — used by PinLayer to write inline top/left from the
   *  anchoring runtime. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Pin — annotation marker on the mockup canvas.
 *
 * Stateless presentation. Position is set by the parent (PinLayer) via
 * the anchoring runtime; this component renders the visual.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §6.
 */
export const Pin = forwardRef<HTMLButtonElement, PinProps>(function Pin(
  {
    annotationId,
    kind = 'published',
    pinIndex,
    colorIndex,
    label,
    status = 'idle',
    removing,
    tooltip,
    onClick,
  },
  ref,
) {
  const cls = [
    styles.pin,
    status === 'active' && styles.active,
    status === 'pending' && styles.pending,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      ref={ref}
      type="button"
      className={cls}
      data-annotation-id={annotationId}
      data-pin-id={annotationId}
      data-pin-kind={kind}
      data-pin-index={pinIndex}
      data-color={colorIndex}
      data-removing={removing ? 'true' : undefined}
      aria-label={tooltip ?? `Annotation #${String(label).padStart(3, '0')}`}
      onClick={onClick}
    >
      <span>{label}</span>
    </button>
  );
});
