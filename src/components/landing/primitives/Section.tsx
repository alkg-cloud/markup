import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './Section.module.css';

type Props = {
  children: ReactNode;
  id?: string;
  width?: 'default' | 'wide';
  className?: string;
};

export function Section({ children, id, width = 'default', className }: Props) {
  return (
    <section id={id} className={cn(styles.section, styles[width], className)}>
      {children}
    </section>
  );
}
