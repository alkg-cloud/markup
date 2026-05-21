'use client';

/**
 * CopyButton — copy-to-clipboard button with inline feedback.
 *
 * Renders a native `<button>` (no Radix primitive — Radix deliberately
 * ships no Button component). Variants via `data-variant` attribute.
 * Feedback state via `data-state="copied"|"error"` on the root.
 *
 * No Radix primitive backs this component — custom compound that
 * composes the project's `useToast` for SR announcement.
 * DS source: docs/design/design-system/30-copy-button.html
 *
 * Primary API:
 *   <CopyButton ariaLabel="Copy token" value={token} />
 *   <CopyButton variant="secondary" ariaLabel="Copy" value={text} feedback="both">Copy</CopyButton>
 *   const { copy, copied } = useCopy(); await copy(text); // hook-only
 */

import type { ReactNode } from 'react';
import { VscCheck, VscCopy } from 'react-icons/vsc';
import styles from './CopyButton.module.css';
import { type UseCopyOptions, useCopy } from './useCopy';

export interface CopyButtonProps extends UseCopyOptions {
  /** The exact string to write to the clipboard. */
  value: string;
  /** Accessible label. Required — no silent SR usage. */
  ariaLabel: string;
  /** Optional visible label content. When omitted, renders icon-only. */
  children?: ReactNode;
  /** Override the default copy icon (VscCopy). */
  icon?: ReactNode;
  /** Override the post-copy icon (VscCheck). */
  copiedIcon?: ReactNode;
  /**
   * Visual variant. Default: 'icon' (28×28 icon-only button).
   * Mirrors DS 13 button family shells.
   */
  variant?: 'icon' | 'ghost' | 'secondary' | 'accent';
  className?: string;
  disabled?: boolean;
  /** @deprecated Use data-tooltip instead — title= on interactive elements is forbidden per code-style.md */
  title?: never;
  /** Portal tooltip text shown on hover/focus (data-tooltip primitive). */
  'data-tooltip'?: string;
  /** Tooltip alignment. Default: left. */
  'data-tooltip-align'?: 'left' | 'center' | 'right';
}

/**
 * CopyButton — the canonical copy-to-clipboard affordance.
 *
 * Icon-only buttons ALWAYS fire a toast (regardless of `feedback` prop)
 * because a silent icon swap is invisible to screen reader users.
 * This rule is enforced here: if `children` is absent, `feedback` is
 * coerced to 'both'. Documented in DS 30 React API bullet + state matrix.
 */
export function CopyButton({
  value,
  ariaLabel,
  children,
  icon,
  copiedIcon,
  variant = 'icon',
  className,
  disabled,
  'data-tooltip': dataTooltip,
  'data-tooltip-align': dataTooltipAlign,
  // useCopy opts
  message = 'Copied to clipboard',
  inlineDurationMs = 1200,
  toastDurationMs = 3000,
  feedback,
}: CopyButtonProps) {
  // Icon-only: force toast on so SR users always get an announcement.
  const resolvedFeedback = !children && feedback === 'inline' ? 'both' : (feedback ?? 'both');

  const { copied, error, copy } = useCopy({
    message,
    inlineDurationMs,
    toastDurationMs,
    feedback: resolvedFeedback,
  });

  const dataState = copied ? 'copied' : error ? 'error' : undefined;

  return (
    <button
      type="button"
      className={`${styles.root}${className ? ` ${className}` : ''}`}
      data-variant={variant !== 'icon' ? variant : undefined}
      data-state={dataState}
      aria-label={ariaLabel}
      data-tooltip={dataTooltip}
      data-tooltip-align={dataTooltipAlign}
      disabled={disabled}
      onClick={() => void copy(value)}
    >
      <span className={styles.iconCopy} aria-hidden="true">
        {icon ?? <VscCopy size={14} />}
      </span>
      <span className={styles.iconCopied} aria-hidden="true">
        {copiedIcon ?? <VscCheck size={14} />}
      </span>
      {children && <span className={styles.label}>{copied ? 'Copied!' : children}</span>}
    </button>
  );
}
