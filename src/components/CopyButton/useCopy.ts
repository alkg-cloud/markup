'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/Toast/useToast';

export interface UseCopyOptions {
  /** Toast/SR announcement text. Default: 'Copied to clipboard'. */
  message?: string;
  /** How long the inline 'copied' state lingers (ms). Default: 1200. */
  inlineDurationMs?: number;
  /** Toast duration (ms). Default: 3000 — matches DS 17 default. */
  toastDurationMs?: number;
  /**
   * Feedback channel.
   * - 'inline' — only the data-state="copied" visual swap.
   * - 'toast' — only the aria-live toast announcement.
   * - 'both' — inline swap AND toast (default).
   *
   * Note: icon-only buttons force a toast on regardless of this setting
   * because a silent icon swap is invisible to screen reader users.
   * That rule is enforced by the CopyButton component, not by this hook.
   */
  feedback?: 'inline' | 'toast' | 'both';
}

export interface UseCopyReturn {
  /** true while the inline "Copied!" state is active (for 'inline' / 'both' feedback). */
  copied: boolean;
  /** 'error' while the failed-copy state is active (for up to inlineDurationMs ms). */
  error: boolean;
  /** Copy `value` to the clipboard. Returns true on success, false on failure. */
  copy: (value: string) => Promise<boolean>;
}

/**
 * useCopy — lower-level copy-to-clipboard hook.
 *
 * Manages the `copied` / `error` boolean states and delegates the SR
 * announcement to the existing `useToast` channel. The `CopyButton`
 * component is a button shell around this hook; call `useCopy` directly
 * for non-button affordances (kebab-menu item "Copy link", click-on-code).
 *
 * No Radix primitive backs this hook — custom, composes `useToast`.
 * DS source: docs/design/design-system/30-copy-button.html
 */
export function useCopy({
  message = 'Copied to clipboard',
  inlineDurationMs = 1200,
  toastDurationMs = 3000,
  feedback = 'both',
}: UseCopyOptions = {}): UseCopyReturn {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const toast = useToast();

  const copy = useCallback(
    async (value: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), inlineDurationMs);
        if (feedback === 'toast' || feedback === 'both') {
          toast.show(message, toastDurationMs);
        }
        return true;
      } catch {
        // CUSTOM error state — not present in any Radix primitive.
        // Clipboard write fails in non-secure contexts (HTTP) or when the
        // user denies the permission. Flagged at three places per AUTHORING:
        // this comment + state matrix row in 30-copy-button.html + API bullet.
        setError(true);
        setTimeout(() => setError(false), inlineDurationMs);
        toast.show('Copy failed', toastDurationMs);
        return false;
      }
    },
    [message, inlineDurationMs, toastDurationMs, feedback, toast],
  );

  return { copied, error, copy };
}
