/**
 * Keyboard-shortcut token maps for the <Kbd> component.
 *
 * Two maps: one for macOS (⌘ ⇧ ⌥ ⌃ symbols) and one for non-mac
 * (Ctrl Shift Alt text labels). Single characters not found in either
 * map are uppercased and emitted as-is.
 *
 * `announceCombo` produces the spelled-out aria-label string that
 * screen readers announce for the keycap group — distinct from
 * `formatShortcut` in `src/lib/shortcuts/platform.ts`, which emits
 * the visual glyph string used in parent button aria-labels.
 *
 * Both helpers take an explicit `mac: boolean` so callers commit to a
 * value that matches what they hydrated with (use `useIsMac()` in
 * components — see `src/lib/shortcuts/platform.ts`).
 */

export type KbdKey =
  | 'mod'
  | 'shift'
  | 'alt'
  | 'ctrl'
  | 'enter'
  | 'esc'
  | 'tab'
  | 'backspace'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | string; // single char or literal fallback

const GLYPH_MAC: Record<string, string> = {
  mod: '⌘',
  shift: '⇧',
  alt: '⌥',
  ctrl: '⌃',
  enter: '↵',
  esc: 'esc',
  tab: '⇥',
  backspace: '⌫',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

const GLYPH_NON_MAC: Record<string, string> = {
  mod: 'Ctrl',
  shift: 'Shift',
  alt: 'Alt',
  ctrl: 'Ctrl',
  enter: 'Enter',
  esc: 'Esc',
  tab: 'Tab',
  backspace: 'Backspace',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

/** SR-friendly spoken names for each token. */
const SR_NAME: Record<string, string> = {
  mod: 'Command', // overridden to 'Control' on non-mac below
  shift: 'Shift',
  alt: 'Option', // 'Alt' on non-mac
  ctrl: 'Control',
  enter: 'Enter',
  esc: 'Escape',
  tab: 'Tab',
  backspace: 'Backspace',
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
};

/**
 * Resolve a KbdKey token to its display glyph for the current OS.
 * Single-character tokens not in the map are uppercased.
 */
export function resolveKey(token: KbdKey, mac: boolean): string {
  const map = mac ? GLYPH_MAC : GLYPH_NON_MAC;
  if (token in map) return map[token];
  return token.length === 1 ? token.toUpperCase() : token;
}

/**
 * Produce the SR-friendly spoken form of a key combo.
 * Example (mac):     announceCombo(['mod','shift','n'], true)  → "shortcut: Command Shift N"
 * Example (non-mac): announceCombo(['mod','shift','n'], false) → "shortcut: Control Shift N"
 */
export function announceCombo(keys: ReadonlyArray<KbdKey>, mac: boolean): string {
  const parts = keys.map((k) => {
    if (k === 'mod') return mac ? 'Command' : 'Control';
    if (k === 'alt') return mac ? 'Option' : 'Alt';
    if (k in SR_NAME) return SR_NAME[k];
    return k.length === 1 ? k.toUpperCase() : k;
  });
  return `shortcut: ${parts.join(' ')}`;
}
