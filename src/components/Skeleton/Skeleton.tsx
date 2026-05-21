'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  /** Optional CSS class. */
  className?: string;
  /** Width — string (e.g. `"60%"`, `"120px"`) or number (px). */
  width?: string | number;
  /** Height — string or number (px). */
  height?: string | number;
  /** `"text"` for label-sized bars, `"circle"` for avatars. */
  variant?: 'block' | 'text' | 'circle';
  /** Optional inline style overrides (margin, gap, etc.). */
  style?: CSSProperties;
}

const dim = (v: string | number | undefined): string | undefined =>
  v == null ? undefined : typeof v === 'number' ? `${v}px` : v;

/**
 * Visual placeholder for content that's still loading. Used in the
 * pre-shell state and per-page loading skeletons (project / folder /
 * mockup view).
 */
export function Skeleton({ className, width, height, variant = 'block', style }: SkeletonProps) {
  const variantClass = variant === 'text' ? styles.text : variant === 'circle' ? styles.circle : '';
  return (
    <span
      aria-hidden="true"
      className={cn(styles.bar, variantClass, className)}
      style={{ ...style, width: dim(width), height: dim(height) }}
    />
  );
}
