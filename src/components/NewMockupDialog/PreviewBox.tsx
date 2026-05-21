'use client';

/**
 * `PreviewBox` — DS 25 preview surface for the New-mockup dialog.
 *
 * Pure presentational component. The state machine lives in
 * `useFilePreview` (returns `loading | ready | fallback`); this component
 * receives the resolved values as props and renders one of three visuals
 * via `[data-state]` on the inner box:
 *
 *   - `loading`  — shimmer gradient + 5 skeleton rows (title + 3 body + cta)
 *   - `ready`    — `<img src={previewDataUrl}>` filling the box
 *   - `fallback` — centered file-type icon ("HTML" or "ZIP") + helper text
 *
 * State derivation priority (also used while uploading — the consumer can
 * force the skeleton back by passing `isLoading={true}`):
 *
 *   1. `isLoading === true`                → loading
 *   2. `fallbackReason != null`            → fallback
 *   3. `previewDataUrl !== null`           → ready
 *   4. default (shouldn't happen)          → fallback (reason: 'error')
 *
 * The `statusLabel` prop is a free-form suffix shown next to the "Preview"
 * label (e.g. `"generating…"`, `"not available for ZIP"`, `"uploading 64%"`).
 */

import styles from './PreviewBox.module.css';

type FallbackReason = 'zip' | 'timeout' | 'error';

export type PreviewBoxProps = {
  file: File;
  previewDataUrl: string | null;
  isLoading: boolean;
  fallbackReason?: FallbackReason | null;
  statusLabel?: string | null;
};

type DerivedState = 'loading' | 'ready' | 'fallback';

function deriveState(props: PreviewBoxProps): DerivedState {
  if (props.isLoading) return 'loading';
  if (props.fallbackReason != null) return 'fallback';
  if (props.previewDataUrl !== null) return 'ready';
  return 'fallback';
}

function fileIconLabel(file: File): 'ZIP' | 'HTML' {
  return file.name.toLowerCase().endsWith('.zip') ? 'ZIP' : 'HTML';
}

export function PreviewBox(props: PreviewBoxProps) {
  const { file, previewDataUrl, isLoading, statusLabel } = props;
  const derivedState = deriveState(props);

  return (
    <div className={styles.previewArea}>
      <span className={styles.previewLabel}>
        Preview
        {statusLabel ? <span className={styles.status}> — {statusLabel}</span> : null}
      </span>
      <div
        className={styles.previewBox}
        data-state={derivedState}
        aria-busy={isLoading || undefined}
      >
        {derivedState === 'loading' ? (
          <div className={styles.skeletonBlocks}>
            <div className={`${styles.row} ${styles.title}`} />
            <div className={styles.row} />
            <div className={styles.row} />
            <div className={`${styles.row} ${styles.short}`} />
            <div className={`${styles.row} ${styles.cta}`} />
          </div>
        ) : null}
        {derivedState === 'fallback' ? (
          <>
            <div className={styles.fallbackIcon}>{fileIconLabel(file)}</div>
            <div className={styles.fallbackText}>Preview generated after upload</div>
          </>
        ) : null}
        {derivedState === 'ready' && previewDataUrl !== null ? (
          <img src={previewDataUrl} alt="Mockup preview" className={styles.image} />
        ) : null}
      </div>
    </div>
  );
}
