'use client';
import { VscHistory } from 'react-icons/vsc';
import styles from './HistoricBanner.module.css';

export interface HistoricBannerProps {
  viewingLabel: string;
  currentLabel: string;
  onExit: () => void;
}

/**
 * HistoricBanner — overlay pill anchored top-center of the viewer canvas
 * (below the toolbar). Signals that the viewer is rendering a past
 * version of the mockup and offers a one-click return to current. Used
 * exclusively by `AppMainViewer` when `isHistoric` is true.
 *
 * Outer wrapper is `role="status" aria-live="polite"` so SR users hear
 * the mode switch. Enter animation respects `prefers-reduced-motion`.
 */
export function HistoricBanner({ viewingLabel, currentLabel, onExit }: HistoricBannerProps) {
  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <VscHistory className={styles.icon} aria-hidden="true" />
      <span className={styles.label}>Viewing {viewingLabel}</span>
      <button
        type="button"
        className={styles.exit}
        onClick={onExit}
        data-tooltip="Back to current version"
        aria-label="Back to current version"
      >
        Back to {currentLabel} (current)
      </button>
    </div>
  );
}
