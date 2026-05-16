import type { CSSProperties, ReactNode } from 'react';
import styles from './AppMain.module.css';

/**
 * Layout slot that fills the area below the Topbar across every page
 * in the `(app)` route group. Wraps content in a `<main>` with a stable
 * `app-main` class (plus a variant-specific class) so external references
 * (issue notes, QA reports, design tweaks) can target it durably.
 *
 * Variants:
 * - `viewer`   — full-bleed, no padding, no scroll (mockup viewer hosts an
 *                iframe inside its own scrollable canvas).
 * - `scroll`   — overflow-y auto, gap-spaced padding (folder/project workspace).
 * - `centered` — fixed max-width column with side padding (settings pages).
 */
export type AppMainVariant = 'viewer' | 'scroll' | 'centered';

interface AppMainProps {
  variant: AppMainVariant;
  children: ReactNode;
  /** Optional class merged after the variant class for one-off tweaks. */
  className?: string;
  /** Optional inline styles (avoid; prefer a CSS module class). */
  style?: CSSProperties;
  /** Optional aria-label for the <main> landmark. */
  ariaLabel?: string;
}

export function AppMain({ variant, children, className, style, ariaLabel }: AppMainProps) {
  const variantClass =
    variant === 'viewer' ? styles.viewer : variant === 'scroll' ? styles.scroll : styles.centered;
  const cls = [styles.appMain, variantClass, className].filter(Boolean).join(' ');
  return (
    <main className={cls} style={style} aria-label={ariaLabel}>
      {children}
    </main>
  );
}
