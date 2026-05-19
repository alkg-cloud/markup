'use client';

import type { ReactNode } from 'react';
import { AppShell } from '../AppShell';

export default function InShellLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
