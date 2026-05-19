'use client';

import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import styles from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  const handleScrimClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: scrim click-to-dismiss
    <div className={styles.scrim} onClick={handleScrimClick} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className={styles.title}>{title}</h2>
        {children}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}

interface DialogFieldProps {
  label: string;
  children: ReactNode;
  /** Optional inline help text rendered below the control. */
  hint?: string;
  /** Optional inline error message; takes precedence over `hint`. */
  error?: string | null;
}

export function DialogField({ label, children, hint, error }: DialogFieldProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: children prop contains the input control
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
      {error ? (
        <span className={styles.error}>{error}</span>
      ) : hint ? (
        <span className={styles.hint}>{hint}</span>
      ) : null}
    </label>
  );
}

export function DialogInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={styles.input} />;
}

interface DialogButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Defaults to `secondary`. `accent` is the primary action,
   *  `danger` is the destructive variant. Matches `confirm-dialog`'s
   *  cancel / confirm / danger treatment. */
  variant?: 'secondary' | 'accent' | 'danger';
}

/**
 * `DialogButton` — shared button primitive for every Dialog action row.
 * Pulls from the same styling pool as `confirm-dialog` so a generic
 * Dialog (project create/edit) and an AlertDialog (delete confirms)
 * read as one design system.
 */
export function DialogButton({
  variant = 'secondary',
  className,
  type = 'button',
  ...rest
}: DialogButtonProps) {
  const variantClass =
    variant === 'accent'
      ? styles.btnAccent
      : variant === 'danger'
        ? styles.btnDanger
        : styles.btnSecondary;
  return (
    <button
      type={type}
      className={[styles.btn, variantClass, className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
