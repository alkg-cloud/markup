import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './PillButton.module.css';

type Variant = 'primary' | 'ghost';
type CommonProps = { variant?: Variant; className?: string; children: ReactNode };

export function PillButton({
  variant = 'primary',
  className,
  children,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${styles.btn} ${styles[variant]} ${className ?? ''}`} {...rest}>
      {children}
    </button>
  );
}

export function PillLink({
  variant = 'primary',
  className,
  children,
  ...rest
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={`${styles.btn} ${styles[variant]} ${className ?? ''}`} {...rest}>
      {children}
    </a>
  );
}
