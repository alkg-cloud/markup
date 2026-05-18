'use client';
import { useEffect, useRef, useState } from 'react';
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
 * Emoji picker — 4×4 grid popover. The trigger button is the dashed
 * "+" pill; clicking it opens the picker, clicking outside closes it.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §10.
 */
export function EmojiPicker({ onPick, emojis = REACTION_EMOJIS }: EmojiPickerProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} className={[styles.wrap, open && styles.open].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={styles.trigger}
        data-tooltip="Add reaction"
        aria-label="Add reaction"
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z" />
        </svg>
      </button>
      <div className={styles.picker} role="menu" aria-label="Reactions">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={styles.pick}
            data-emoji={emoji}
            aria-label={`React with ${emoji}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onPick(emoji);
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
