import type { ReactNode } from 'react';
import styles from './Section.module.css';

type Props = {
  children: ReactNode;
  id?: string;
  width?: 'default' | 'narrow' | 'wide';
  className?: string;
};

export function Section({ children, id, width = 'default', className }: Props) {
  return (
    <section
      id={id}
      className={[styles.section, styles[width], className].filter(Boolean).join(' ')}
    >
      {children}
    </section>
  );
}
