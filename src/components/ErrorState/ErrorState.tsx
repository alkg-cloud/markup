'use client';

import styles from './ErrorState.module.css';

interface ErrorStateProps {
  /** Short error code or message. Rendered as the primary line. */
  error: string;
  /** Optional retry callback — shows a "Try again" button when present. */
  onRetry?: () => void;
}

/**
 * Page-level error placeholder. Renders a centered, danger-toned
 * message with an optional retry button. Use for fetch failures
 * (HTTP errors, network errors) on client-side pages.
 */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.container} role="alert">
      <p className={styles.message}>{error}</p>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
