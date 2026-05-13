'use client';

import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';
import { ToastContext, type Toast as ToastItem, useToastState } from './useToast';

interface ToastPillProps {
  toast: ToastItem;
  onRemove: (id: string) => void;
}

function ToastPill({ toast, onRemove }: ToastPillProps) {
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const el = pillRef.current;
      if (el) {
        el.classList.add(styles.out);
        el.addEventListener('animationend', () => onRemove(toast.id), { once: true });
      } else {
        onRemove(toast.id);
      }
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div ref={pillRef} className={styles.toast}>
      {toast.message}
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return createPortal(
    <div className={styles.container} aria-live="assertive" aria-atomic="false">
      {toasts.map((t) => (
        <ToastPill key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>,
    document.body,
  );
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const ctx = useToastState();
  const { remove } = ctx;

  const handleRemove = useCallback((id: string) => remove(id), [remove]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {typeof window !== 'undefined' && (
        <ToastContainer toasts={ctx.toasts} onRemove={handleRemove} />
      )}
    </ToastContext.Provider>
  );
}
