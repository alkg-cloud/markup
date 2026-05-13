'use client';

import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
import styles from './Toast.module.css';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastEntry {
  id: number;
  message: string;
  variant: ToastVariant;
  exiting: boolean;
}

interface ToastAPI {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastAPI>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const DURATION_MS = 4000;
const EXIT_MS = 160;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_MS);
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, variant, exiting: false }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className={styles.container} aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toast} ${styles[t.variant] ?? ''}`}
            data-exiting={t.exiting || undefined}
            role="status"
          >
            <ToastIcon variant={t.variant} />
            <span className={styles.message}>{t.message}</span>
            <button
              type="button"
              className={styles.dismiss}
              aria-label="Fechar notificação"
              onClick={() => dismiss(t.id)}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M2 2l8 8M10 2l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const cls = `${styles.icon} ${
    variant === 'success'
      ? styles.iconSuccess
      : variant === 'error'
        ? styles.iconError
        : variant === 'warning'
          ? styles.iconWarning
          : styles.iconInfo
  }`;

  if (variant === 'success') {
    return (
      <svg className={cls} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3 8.5l3 3 7-7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (variant === 'error') {
    return (
      <svg className={cls} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
      </svg>
    );
  }

  if (variant === 'warning') {
    return (
      <svg className={cls} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 2l6.5 11H1.5L8 2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M8 7v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg className={cls} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="4.5" r="0.75" fill="currentColor" />
    </svg>
  );
}
