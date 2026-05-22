'use client';

/**
 * `Kbd` — keyboard-shortcut indicator.
 *
 * Renders each key as its own isolated keycap chip (`<kbd>` element for
 * semantics). OS-aware: macOS uses ⌘⇧⌥⌃ symbols with naked adjacency (no
 * `+` between caps); Windows/Linux uses Ctrl/Shift/Alt text labels with an
 * explicit `+` separator.
 *
 * No Radix primitive backs this component — Radix Primitives ships no kbd or
 * shortcut primitive. Custom compound at src/components/Kbd/Kbd.tsx.
 * DS source: docs/design/design-system/29-kbd.html
 *
 * Primary API:
 *   <Kbd keys={['mod', 'shift', 'n']} />
 *   → mac:  [⌘] [⇧] [N]
 *   → win:  [Ctrl] + [Shift] + [N]
 *
 * Escape hatch for multi-glyph single chips (e.g. ↑↓ navigates up/down):
 *   <Kbd.Group><Kbd.Key>↑↓</Kbd.Key></Kbd.Group>
 */

import type { CSSProperties, ReactNode } from 'react';
import { useIsMacSettled } from '@/lib/shortcuts/platform';
import styles from './Kbd.module.css';
import { announceCombo, type KbdKey, resolveKey } from './keys';

// ─── Sub-components ──────────────────────────────────────────────────────────

interface GroupProps {
  children: ReactNode;
  /** Sets data-state="disabled" on the wrapper. No consumer yet — CSS hook. */
  disabled?: boolean;
  /** Pass-through for parent spacing overrides. */
  className?: string;
  /** aria-label for the group; callers may supply a custom announcement. */
  'aria-label'?: string;
  /** Optional inline style; used by the primary `Kbd` component to
   *  hide the keycap until `useIsMacSettled()` resolves. */
  style?: CSSProperties;
}

function Group({ children, disabled, className, style, 'aria-label': ariaLabel }: GroupProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: <fieldset> is block-level; inline keycap groups must use <span role="group">
    <span
      role="group"
      aria-label={ariaLabel}
      data-state={disabled ? 'disabled' : undefined}
      className={`${styles.group}${className ? ` ${className}` : ''}`}
      style={style}
    >
      {children}
    </span>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: <kbd> is not focusable; aria-hidden hides individual keycaps so the Group's aria-label announces the whole combo once
    <kbd className={styles.key} aria-hidden="true">
      {children}
    </kbd>
  );
}

function Plus() {
  return (
    <span className={styles.plus} aria-hidden="true">
      +
    </span>
  );
}

// ─── Primary component ────────────────────────────────────────────────────────

export interface KbdProps {
  /** Ordered array of key tokens to render as adjacent keycaps. */
  keys: ReadonlyArray<KbdKey>;
  /** Grays out the group (opacity 0.5) — no consumer yet; CSS hook. */
  disabled?: boolean;
  /** Pass-through className for parent spacing. */
  className?: string;
}

export function Kbd({ keys, disabled, className }: KbdProps) {
  // SSR + first client paint use the non-Mac branch so the hydrated
  // DOM matches the server. After mount `useIsMacSettled` returns the
  // real value and `settled: true`; the keycap content stays
  // visibility-hidden until then so Mac users don't see a one-frame
  // Ctrl→⌘ flicker after hydration.
  const { mac, settled } = useIsMacSettled();
  const label = announceCombo(keys, mac);

  const children: ReactNode[] = [];
  keys.forEach((token, i) => {
    if (i > 0 && !mac) {
      children.push(<Plus key={`plus-${i}`} />);
    }
    children.push(<Key key={`key-${i}`}>{resolveKey(token, mac)}</Key>);
  });

  return (
    <Group
      aria-label={label}
      disabled={disabled}
      className={className}
      style={settled ? undefined : { visibility: 'hidden' }}
    >
      {children}
    </Group>
  );
}

// Attach sub-components for escape-hatch usage
Kbd.Group = Group;
Kbd.Key = Key;
Kbd.Plus = Plus;
