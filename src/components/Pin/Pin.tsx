'use client';
import { type MouseEvent, type Ref, forwardRef } from 'react';
import styles from './Pin.module.css';

export type PinStatus = 'idle' | 'active' | 'pending';

export interface PinProps {
  /** Stable identifier — exposed as `data-annotation-id` so click delegation
   *  on the pin layer can map back to the annotation. */
  annotationId: string;
  /** Index into the 16-color palette (0..15). */
  colorIndex: number;
  /** Number rendered inside the pin (typically the annotation number). */
  label: number | string;
  /** Visual state. `active` adds the pulsing glow; `pending` renders the
   *  dashed-outline composer-placement variant. */
  status?: PinStatus;
  /** Custom tooltip — replaces native `title` per the spec's tooltip rule.
   *  Falls back to "Annotation #001" aria-label when omitted. */
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
  { annotationId, colorIndex, label, status = 'idle', tooltip, onClick },
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
      data-color={colorIndex}
      data-tooltip={tooltip}
      aria-label={tooltip ?? `Annotation #${String(label).padStart(3, '0')}`}
      onClick={onClick}
    >
      <span>{label}</span>
    </button>
  );
});
