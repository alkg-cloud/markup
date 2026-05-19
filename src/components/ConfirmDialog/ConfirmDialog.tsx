'use client';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import styles from './ConfirmDialog.module.css';

export interface ConfirmOptions {
  title: string;
  /** Optional body copy. Markdown is NOT rendered; pass plain text. */
  description?: ReactNode;
  /** Label for the primary action button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel/escape action. Defaults to "Cancel". */
  cancelLabel?: string;
  /** When true the primary button uses the `--danger` accent palette. */
  danger?: boolean;
}

export interface UseConfirmReturn {
  /** Show the dialog and resolve with the user's choice. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  /** Render this slot once in the consumer's tree (typically at the
   *  page root) so the dialog can portal above the rest of the UI. */
  dialog: ReactNode;
}

/**
 * `useConfirm` — Promise-based replacement for `window.confirm`.
 *
 * Markup never uses the native `alert` / `confirm` / `prompt` dialogs —
 * they ignore the design tokens, can't be styled, and on touchscreens
 * they hijack the page. This hook gives the same imperative ergonomics
 * but renders a styled Radix `AlertDialog` matching the glass-surface
 * standard (rail, toolbar, popovers, tooltips).
 *
 * See `docs/feature-catalog.md` `confirm-dialog` and `CLAUDE.md` for the
 * "no native dialogs" guideline.
 */
export function useConfirm(): UseConfirmReturn {
  const [state, setState] = useState<{ open: boolean; opts: ConfirmOptions | null }>({
    open: false,
    opts: null,
  });
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, opts });
    });
  }, []);

  const settle = useCallback((v: boolean) => {
    resolverRef.current?.(v);
    resolverRef.current = null;
    setState((cur) => ({ open: false, opts: cur.opts }));
  }, []);

  const opts = state.opts;
  const dialog = (
    <AlertDialog.Root
      open={state.open}
      onOpenChange={(o) => {
        if (!o) settle(false);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.overlay} />
        <AlertDialog.Content className={styles.content}>
          <AlertDialog.Title className={styles.title}>{opts?.title ?? ''}</AlertDialog.Title>
          {opts?.description ? (
            <AlertDialog.Description className={styles.description}>
              {opts.description}
            </AlertDialog.Description>
          ) : null}
          <div className={styles.actions}>
            <AlertDialog.Cancel asChild>
              <button type="button" className={styles.cancel} onClick={() => settle(false)}>
                {opts?.cancelLabel ?? 'Cancel'}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                className={[styles.confirm, opts?.danger && styles.danger]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => settle(true)}
              >
                {opts?.confirmLabel ?? 'Confirm'}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );

  return { confirm, dialog };
}
