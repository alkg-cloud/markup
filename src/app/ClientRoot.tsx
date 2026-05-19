'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/Toast/Toast';
import { TooltipPortal } from '@/components/Tooltip/TooltipPortal';

/**
 * Client-side root providers. The Next.js root layout
 * (`src/app/layout.tsx`) stays server-only — it sets up `<html>`,
 * fonts, and metadata, and mounts this component under `<body>`.
 * Anything that needs React state (toasts, tooltip portal, future
 * theme provider) belongs here.
 */
export function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <TooltipPortal />
    </ToastProvider>
  );
}
