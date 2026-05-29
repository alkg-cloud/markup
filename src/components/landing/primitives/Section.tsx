import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './Section.module.css';

type Props = {
  children: ReactNode;
  id?: string;
  className?: string;
};

export function Section({ children, id, className }: Props) {
  return (
    <section id={id} className={cn(styles.section, className)}>
      {children}
    </section>
  );
}
