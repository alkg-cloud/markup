import styles from './Brand.module.css';

export function Brand({ size = 15 }: { size?: number }) {
  return (
    <span className={styles.brand} style={{ fontSize: size }}>
      Markup
      <span className={styles.dot} />
    </span>
  );
}
