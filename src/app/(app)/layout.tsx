'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, useCallback } from 'react';
import { DropOverlay } from '@/components/DropOverlay';
import { NewMockupDialogProvider } from '@/components/NewMockupDialog';
import { DragTargetProvider } from '@/hooks/useDragTarget';
import { resolveTargetFromPath } from '@/lib/upload/resolve-target';
import { AppShell } from '../AppShell';

/**
 * `(app)/layout.tsx` — owns three pieces of upload infrastructure:
 *
 *  1. `<DragTargetProvider>` — listens to document-level drag events and
 *     publishes the current target (resolved from the URL via the
 *     shared `resolveTargetFromPath` resolver).
 *  2. `<NewMockupDialogProvider>` — owns the upload dialog's open/close
 *     state and the project / folder data the dialog needs. Mounts a
 *     single `<NewMockupDialog>` instance descendants reach via the
 *     `useNewMockupDialog()` hook.
 *  3. `<DropOverlay />` — the DS 24 scrim, rendered alongside the shell
 *     so it portals over every page.
 *
 * Everything else in this tree (auth gating, the sidebar, the topbar,
 * etc.) is hosted inside `<AppShell>`, which renders the children for
 * the (app) route group.
 */
export default function InShellLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Memoize the resolver so the provider's drag-event listeners read
  // the latest pathname without resubscribing on every render. The
  // resolver itself is pure — pathname goes in, target comes out.
  const resolveTarget = useCallback(() => resolveTargetFromPath(pathname), [pathname]);

  return (
    <DragTargetProvider resolveTarget={resolveTarget}>
      <NewMockupDialogProvider>
        <AppShell>{children}</AppShell>
        <DropOverlay />
      </NewMockupDialogProvider>
    </DragTargetProvider>
  );
}
