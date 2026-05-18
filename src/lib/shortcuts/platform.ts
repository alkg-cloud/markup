/**
 * OS-aware modifier detection.
 *
 * macOS uses ⌘ (metaKey); Windows + Linux use Ctrl (ctrlKey).
 * Components that show a shortcut hint should display the symbol from
 * `modSymbol`; components that listen for shortcuts should test via
 * `isMod(e)` instead of hardcoding either key.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §13.
 */

/** Detects macOS at module load. Re-detected each call so SSR + hydration
 *  match — `navigator` only exists in the browser. */
export const isMac = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform =
    'platform' in navigator ? (navigator as Navigator & { platform: string }).platform : '';
  return /Mac|iPhone|iPad/.test(platform || ua);
};

/**
 * Display symbol for the primary modifier on the current OS.
 *
 * Called as a function (not a constant) so the value is recomputed each
 * time it's read — important because the module evaluates once at SSR
 * where `navigator` is undefined. Components should call this from a
 * `useEffect`-fed state so the rendered text matches the client's OS.
 */
export function modSymbol(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

/**
 * Returns true when the keyboard event has the OS-appropriate primary
 * modifier pressed (Cmd on Mac, Ctrl elsewhere). Use this instead of
 * `e.metaKey || e.ctrlKey` so the wrong key on the wrong OS doesn't
 * trigger your handler.
 */
export const isMod = (e: KeyboardEvent | React.KeyboardEvent): boolean =>
  isMac() ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;

/** Format a shortcut for tooltips/menus. e.g. ['shift','n'] => "⌘⇧N". */
export function formatShortcut(keys: ReadonlyArray<string>): string {
  const parts: string[] = [modSymbol()];
  for (const k of keys) {
    if (k === 'shift') parts.push('⇧');
    else if (k === 'alt') parts.push(isMac() ? '⌥' : 'Alt');
    else parts.push(k.length === 1 ? k.toUpperCase() : k);
  }
  return parts.join(isMac() ? '' : '+');
}
