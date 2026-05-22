'use client';

import * as RadixToast from '@radix-ui/react-toast';
import type React from 'react';
import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';
import styles from './Toast.module.css';

export interface ToastItem {
  id: string;
  message: string;
  duration: number;
}

interface ToastContextValue {
  show: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

let counter = 0;

/**
 * Imperative toast provider — wraps Radix `@radix-ui/react-toast` so
 * a11y semantics (aria-live region, focus-grab on Action, swipe-to-
 * dismiss) come for free while consumers keep the existing
 * `const { show } = useToast(); show('saved!')` API.
 *
 * Each `show()` call appends a queue item; we render one
 * `Toast.Root` per item. Radix handles the open→closed transition
 * + the duration timer; when `onOpenChange(false)` fires we drop
 * the item from the queue so the DOM stays minimal. Visual style is
 * DS 17 — glass pill, bottom-center stack, 360ms ease-spring enter.
 */
export function ToastProvider({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, duration = 3000) => {
    const id = String(++counter);
    setToasts((prev) => [...prev, { id, message, duration }]);
  }, []);

  const handleOpenChange = useCallback((id: string, open: boolean) => {
    if (!open) setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return createElement(
    ToastContext.Provider,
    { value: { show } },
    createElement(
      RadixToast.Provider,
      // swipeDirection="up" — the viewport sits at the bottom; an
      // upward swipe lifts it off the bottom edge to dismiss.
      { swipeDirection: 'up', duration: 3000 },
      children,
      ...toasts.map((t) =>
        // Radix props omit `data-*` from their declared signatures; pass
        // through via cast so we keep a stable test handle.
        createElement(
          RadixToast.Root,
          {
            key: t.id,
            duration: t.duration,
            open: true,
            onOpenChange: (open: boolean) => handleOpenChange(t.id, open),
            className: styles.pill,
            'data-testid': 'toast-pill',
          } as React.ComponentProps<typeof RadixToast.Root>,
          createElement(RadixToast.Description, null, t.message),
        ),
      ),
      createElement(RadixToast.Viewport, {
        className: styles.container,
        'data-testid': 'toast-container',
      } as React.ComponentProps<typeof RadixToast.Viewport>),
    ),
  );
}

/** Imperative handle. Returns a stable `show(message, duration?)`
 *  callback usable from any descendant of `<ToastProvider>`. */
export function useToast() {
  return useContext(ToastContext);
}
