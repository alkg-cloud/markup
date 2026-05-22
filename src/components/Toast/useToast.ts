'use client';

import * as RadixToast from '@radix-ui/react-toast';
import type React from 'react';
import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import styles from './Toast.module.css';

export interface ToastItem {
  id: string;
  message: string;
  duration: number;
  /**
   * `true` while the Radix Toast is in its closing transition. We keep
   * the item in the array until `animationend` fires so the
   * `[data-state="closed"]` exit keyframes have a chance to run.
   */
  closing?: boolean;
}

interface ToastContextValue {
  show: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

/**
 * Imperative toast provider — wraps Radix `@radix-ui/react-toast` so
 * a11y semantics (aria-live region, focus-grab on Action, swipe-to-
 * dismiss) come for free while consumers keep the existing
 * `const { show } = useToast(); show('saved!')` API.
 *
 * Each `show()` call appends a queue item; we render one
 * `Toast.Root` per item with `forceMount` so the closing transition
 * survives `onOpenChange(false)`. The animationend listener on the
 * pill drops the item from the queue once the exit keyframes have
 * finished. Visual style is DS 17 — glass pill, bottom-center stack,
 * 360ms ease-spring enter, 200ms ease-exit close.
 */
export function ToastProvider({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Per-provider counter — module globals would leak between HMR /
  // double-mount cycles, which broke id-stability inside test suites
  // that remount the provider repeatedly.
  const counterRef = useRef(0);

  const show = useCallback((message: string, duration = 3000) => {
    counterRef.current += 1;
    const id = String(counterRef.current);
    setToasts((prev) => [...prev, { id, message, duration }]);
  }, []);

  // First step of the close: Radix calls `onOpenChange(false)` when
  // either the duration timer expires or the user swipes. We flip
  // `closing: true` so React re-renders the Root with `open={false}`,
  // which makes Radix set `[data-state="closed"]` on the DOM node.
  // The CSS keyframes then run; `handleAnimationEnd` removes the row.
  //
  // Fallback timeout: under `prefers-reduced-motion: reduce` the
  // close animation is zeroed (no `animationend` fires) — and an
  // unmount mid-animation could also strand the row. A short
  // post-close timeout guarantees the queue eventually shrinks.
  const handleOpenChange = useCallback((id: string, open: boolean) => {
    if (open) return;
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const handleAnimationEnd = useCallback(
    (id: string, event: React.AnimationEvent<HTMLLIElement>) => {
      // Only the exit animation (`toastOut` / `toastSwipeOut`) signals
      // end-of-life. The enter animation (`toastIn`) also fires
      // `animationend`; ignore it so we don't tear the toast down on
      // first paint. Match by substring because Turbopack's CSS
      // Modules pipeline hashes the keyframe name into something like
      // `Toast-module__xxx__toastOut`.
      const name = event.animationName;
      if (!name.includes('toastOut') && !name.includes('toastSwipeOut')) return;
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [],
  );

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
        // Radix props omit `data-*` and `forceMount` from their
        // declared signatures in some package versions; pass through
        // via cast so we keep a stable test handle and survive the
        // close transition.
        createElement(
          RadixToast.Root,
          {
            key: t.id,
            duration: t.duration,
            open: !t.closing,
            forceMount: true,
            onOpenChange: (open: boolean) => handleOpenChange(t.id, open),
            onAnimationEnd: (event: React.AnimationEvent<HTMLLIElement>) =>
              handleAnimationEnd(t.id, event),
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
