'use client';
import styles from './MarkingBar.module.css';

export interface MarkingBarProps {
  open: boolean;
  pinCount: number;
  onDone?: () => void;
}

/**
 * MarkingBar — top-center mode indicator that surfaces during the
 * composer's marking mode. Shows a live count of pending pins + a Done
 * button that exits marking.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §7.
 */
export function MarkingBar({ open, pinCount, onDone }: MarkingBarProps) {
  const pinLabel = `${pinCount} ${pinCount === 1 ? 'pin' : 'pins'}`;
  return (
    <div className={[styles.bar, open && styles.open].filter(Boolean).join(' ')} role="status">
      <span className={styles.label}>
        <span className={styles.dot} aria-hidden="true" />
        Click on the canvas to drop a pin · Esc to finish
      </span>
      <span className={styles.count}>{pinLabel}</span>
      <button type="button" className={styles.done} onClick={onDone} aria-label="Finish placing pins">
        Done
      </button>
    </div>
  );
}
