import styles from './MockupViewer.module.css';

interface Props {
  diffText: string | null;
  onClose: () => void;
}

export function MockupDiffModal({ diffText, onClose }: Props) {
  return (
    <div
      role="dialog"
      aria-label="Version diff"
      aria-modal="true"
      className={styles.diffOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className={styles.diffPanel}>
        <header className={styles.diffHeader}>
          <h2 className={styles.diffTitle}>Diff — previous vs current</h2>
          <button
            type="button"
            aria-label="Close diff"
            onClick={onClose}
            className={styles.diffClose}
          >
            ✕
          </button>
        </header>
        <pre className={styles.diffBody}>{diffText ?? 'Loading diff…'}</pre>
      </div>
    </div>
  );
}
