import type { ReactNode } from 'react';
import styles from './Eyebrow.module.css';

export function Eyebrow({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <span className={`${styles.eyebrow} ${muted ? styles.muted : ''}`}>
      <span className={styles.dot} />
      {children}
    </span>
  );
}
