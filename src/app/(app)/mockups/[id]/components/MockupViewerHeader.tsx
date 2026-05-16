import Link from 'next/link';
import styles from './MockupViewer.module.css';

interface Props {
  mockupName: string;
  versionLabel: string;
  busy: boolean;
  onVersionsScroll: () => void;
  onCapture: () => void;
}

export function MockupViewerHeader({
  mockupName,
  versionLabel,
  busy,
  onVersionsScroll,
  onCapture,
}: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <Link href="/" className={styles.backLink}>
          ← Projects
        </Link>
        <span aria-hidden="true" className={styles.headerDivider} />
        <div className={styles.headerTitleRow}>
          <span className={styles.headerTitle}>{mockupName}</span>
          <span className={styles.versionPill}>{versionLabel}</span>
        </div>
      </div>
      <div className={styles.headerActions}>
        <button type="button" className={styles.btnGhost} onClick={onVersionsScroll}>
          Versions
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={onCapture}
          disabled={busy}
          data-testid="comment-button"
        >
          {busy ? 'Capturing…' : '+ Comment'}
        </button>
      </div>
    </header>
  );
}
