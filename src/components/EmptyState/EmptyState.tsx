'use client';

import styles from './EmptyState.module.css';

interface EmptyStateProps {
  variant: 'project' | 'folder';
  onUpload?: () => void;
  onCreateFolder?: () => void;
}

export function EmptyState({ variant, onUpload, onCreateFolder }: EmptyStateProps) {
  const title = 'Nenhum mockup ainda';
  const subtitle =
    variant === 'project'
      ? 'Crie uma pasta para organizar ou faça upload do primeiro mockup.'
      : 'Crie uma subpasta ou faça upload de um mockup.';

  return (
    <div className={styles.container}>
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className={styles.icon}
      >
        <rect
          x="7"
          y="12"
          width="34"
          height="24"
          rx="4"
          stroke="var(--border-strong)"
          strokeWidth="2"
        />
        <rect x="5" y="9" width="34" height="24" rx="4" stroke="var(--border)" strokeWidth="1.5" />
        <rect
          x="3"
          y="6"
          width="34"
          height="24"
          rx="4"
          stroke="var(--border-subtle)"
          strokeWidth="1"
        />
        <rect x="12" y="19" width="12" height="2" rx="1" fill="var(--border-strong)" />
        <rect x="12" y="23" width="20" height="2" rx="1" fill="var(--border)" />
      </svg>

      <h2 className={styles.title}>{title}</h2>
      <p className={styles.desc}>{subtitle}</p>

      <div className={styles.actions}>
        {onUpload && (
          <button type="button" className={styles.btnAccent} onClick={onUpload}>
            Fazer upload de mockup
          </button>
        )}
        {onCreateFolder && (
          <button type="button" className={styles.btnSecondary} onClick={onCreateFolder}>
            Criar pasta
          </button>
        )}
      </div>
    </div>
  );
}
