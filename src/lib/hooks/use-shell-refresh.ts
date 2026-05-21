'use client';

import { createContext, useContext } from 'react';

/**
 * Lets descendants of `AppShell` invalidate the cached `/api/shell`
 * payload after a mutation (rename / move / delete / new project).
 *
 * `AppShell` owns the actual fetch effect and bumps an internal version
 * counter when `refreshShell()` is called, which retriggers the effect
 * and reads the latest projects / orphanMockups / recents in one round-
 * trip — no per-mutation surgical patching of client state.
 *
 * Outside of `AppShell` (tests, storybook harnesses) the default no-op
 * means callers don't have to null-check.
 */
export const ShellRefreshContext = createContext<() => void>(() => {});

export function useShellRefresh(): () => void {
  return useContext(ShellRefreshContext);
}
