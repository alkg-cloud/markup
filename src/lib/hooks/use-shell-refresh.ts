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
 * Outside of `AppShell` (tests, storybook harnesses) the default
 * implementation no-ops so callers don't have to null-check. In dev
 * we log a one-line warning so a missing provider in production code
 * surfaces loudly during testing.
 */
const defaultRefresh = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[markup] useShellRefresh() called without a ShellRefreshContext provider — mutation will not refresh the sidebar. This is fine in unit tests; in app code it likely means AppShell did not wrap the component.',
    );
  }
};

export const ShellRefreshContext = createContext<() => void>(defaultRefresh);

export function useShellRefresh(): () => void {
  return useContext(ShellRefreshContext);
}
