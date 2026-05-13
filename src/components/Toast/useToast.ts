'use client';

import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useReducer,
} from 'react';

export interface ToastItem {
  id: string;
  message: string;
}

type ToastAction =
  | { type: 'add'; id: string; message: string; duration: number }
  | { type: 'remove'; id: string };

export function toastReducer(state: ToastItem[], action: ToastAction): ToastItem[] {
  if (action.type === 'add') return [...state, { id: action.id, message: action.message }];
  if (action.type === 'remove') return state.filter((t) => t.id !== action.id);
  return state;
}

interface ToastContextValue {
  toasts: ToastItem[];
  show: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  show: () => {},
});

let counter = 0;

export function ToastProvider({ children }: { children?: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const show = useCallback((message: string, duration = 3000) => {
    const id = String(++counter);
    dispatch({ type: 'add', id, message, duration });
    setTimeout(() => dispatch({ type: 'remove', id }), duration);
  }, []);

  return createElement(
    ToastContext.Provider,
    { value: { toasts, show } },
    children,
    createElement(
      'div',
      { 'aria-live': 'assertive', 'aria-atomic': 'false', className: 'toast-container' },
      ...toasts.map((t) =>
        createElement('div', { key: t.id, className: 'toast-pill', role: 'status' }, t.message),
      ),
    ),
  );
}

export function useToast() {
  return useContext(ToastContext);
}
