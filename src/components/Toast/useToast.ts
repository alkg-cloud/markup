'use client';

import { createContext, useCallback, useContext, useState } from 'react';

export interface Toast {
  id: string;
  message: string;
  duration: number;
}

interface ToastContextValue {
  toasts: Toast[];
  show: (message: string, duration?: number) => void;
  remove: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  show: () => {},
  remove: () => {},
});

export function useToastState(): ToastContextValue {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, duration = 3000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, duration }]);
  }, []);

  return { toasts, show, remove };
}

export function useToast() {
  return useContext(ToastContext);
}
