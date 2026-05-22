/**
 * OS-aware modifier detection.
 *
 * macOS uses ⌘ (metaKey); Windows + Linux use Ctrl (ctrlKey).
 * Components that show a shortcut hint should display the symbol via
 * the `useIsMac()` hook (so SSR + first paint use the stable non-Mac
 * value and the swap happens after hydration); components that listen
 * for shortcuts can use the `isMac()` predicate directly since
 * `isMod(e)` only ever runs in event handlers (post-mount).
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §13.
 */

import { useEffect, useState } from 'react';

/** Returns `true` when the current navigator is a Mac. Returns `false`
 *  on the server (where `navigator` is undefined) and in any other
 *  pre-mount path. Components that render platform-conditional text
 *  should use `useIsMac()` instead to avoid hydration mismatches. */
export const isMac = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform =
    'platform' in navigator ? (navigator as Navigator & { platform: string }).platform : '';
  return /Mac|iPhone|iPad/.test(platform || ua);
};

/**
 * React hook companion to `isMac()`. Returns `false` during SSR and on
 * the first client render so the hydrated DOM matches the server's
 * output (which can't read `navigator`). Then, in a post-mount effect,
 * upgrades to the real value. The brief Ctrl→⌘ swap is intentional —
 * it happens after hydration, so React doesn't warn about a mismatch.
 */
export function useIsMac(): boolean {
  const [mac, setMac] = useState(false);
  useEffect(() => {
    setMac(isMac());
  }, []);
  return mac;
}

/**
 * Returns true when the keyboard event has the OS-appropriate primary
 * modifier pressed (Cmd on Mac, Ctrl elsewhere). Use this instead of
 * `e.metaKey || e.ctrlKey` so the wrong key on the wrong OS doesn't
 * trigger your handler.
 */
export const isMod = (e: KeyboardEvent | React.KeyboardEvent): boolean =>
  isMac() ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;

/**
 * Format a shortcut for tooltips / aria-labels. Implicitly prepends the
 * platform modifier (⌘ / Ctrl) before the provided keys.
 *
 * e.g. `formatShortcut(['shift','n'], true)` → "⌘⇧N" on Mac,
 *      `formatShortcut(['shift','n'], false)` → "Ctrl+Shift+N" elsewhere.
 *
 * The `mac` argument is mandatory so callers commit to a value that
 * matches the value they hydrated with — in React components, that
 * value should come from `useIsMac()` so the SSR value (false) and
 * the first client paint agree.
 */
export function formatShortcut(keys: ReadonlyArray<string>, mac: boolean): string {
  const parts: string[] = [mac ? '⌘' : 'Ctrl'];
  for (const k of keys) {
    if (k === 'shift') parts.push('⇧');
    else if (k === 'alt') parts.push(mac ? '⌥' : 'Alt');
    else parts.push(k.length === 1 ? k.toUpperCase() : k);
  }
  return parts.join(mac ? '' : '+');
}
