'use client';

import styles from './LoadingState.module.css';

interface LoadingStateProps {
  /** Optional message — defaults to "Loading…". */
  message?: string;
}

/**
 * Page-level loading placeholder. Renders a centered, dimmed message
 * with `role="status"` + `aria-live="polite"` so assistive tech
 * announces it once the surrounding region mounts.
 */
export function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <div className={styles.container} role="status" aria-live="polite" aria-busy="true">
      <span className={styles.message}>{message}</span>
    </div>
  );
}
