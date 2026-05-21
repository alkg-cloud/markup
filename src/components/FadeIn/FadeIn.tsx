'use client';

import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './FadeIn.module.css';

interface FadeInProps {
  /** Content rendered post-load. */
  children: ReactNode;
  /** Optional element type — defaults to `div`. */
  as?: ElementType;
  /** Optional CSS class composed alongside the fade-in animation. */
  className?: string;
}

/**
 * Canonical wrapper for the "skeleton → real content" transition.
 *
 * Plays a 220 ms ease-out fade + 2 px slide-up on mount, then sits at
 * the resting state. Respects `prefers-reduced-motion`. See
 * `docs/frontend/components.md` § "Loading states" for the usage
 * contract.
 */
export function FadeIn({ children, as: Tag = 'div', className }: FadeInProps) {
  return <Tag className={cn(styles.root, className)}>{children}</Tag>;
}
