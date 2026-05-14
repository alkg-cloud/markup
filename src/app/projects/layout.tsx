import type { ReactNode } from 'react';
import { AppShell } from '../AppShell';

export default async function ProjectsLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

export const dynamic = 'force-dynamic';
