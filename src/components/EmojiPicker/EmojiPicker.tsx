'use client';
import { usePopover } from '@/lib/popover/usePopover';
import styles from './EmojiPicker.module.css';

export const REACTION_EMOJIS: ReadonlyArray<string> = [
  '👍',
  '👎',
  '❤️',
  '🎉',
  '💯',
  '👀',
  '🔥',
  '✅',
  '😂',
  '😍',
  '🙏',
  '🚀',
  '💡',
  '✨',
  '🤔',
  '👏',
];

export interface EmojiPickerProps {
  /** Fired when an emoji is chosen. */
  onPick: (emoji: string) => void;
  /** Override the default 16-emoji set. */
  emojis?: ReadonlyArray<string>;
}

/**
 * Emoji picker — 4×4 grid popover. Built on the native HTML popover
 * API (`popover="auto"`) so it paints in the top-layer (escapes every
 * overflow ancestor + stacking context — no JS portal needed). The
 * browser handles outside-click + ESC + single-popover-active.
 *
 * See `docs/code-style.md § Popovers` for the canonical pattern.
 */
export function EmojiPicker({ onPick, emojis = REACTION_EMOJIS }: EmojiPickerProps) {
  const { triggerRef, popoverRef, triggerProps, popoverProps, close } = usePopover<
    HTMLButtonElement,
    HTMLDivElement
  >('left');

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        data-tooltip="Add reaction"
        aria-label="Add reaction"
        aria-haspopup="menu"
        {...triggerProps}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z" />
        </svg>
      </button>
      <div {...popoverProps} ref={popoverRef} className={styles.picker} role="menu" aria-label="Reactions">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={styles.pick}
            data-emoji={emoji}
            aria-label={`React with ${emoji}`}
            onClick={() => {
              close();
              onPick(emoji);
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}
