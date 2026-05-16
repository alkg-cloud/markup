import styles from './MockupViewer.module.css';

export function StatusPill({ status }: { status: string }) {
  const isResolved = status === 'resolved';
  const cls = `${styles.statusPill} ${isResolved ? styles.statusPillResolved : styles.statusPillOpen}`;
  return <span className={cls}>{status}</span>;
}
