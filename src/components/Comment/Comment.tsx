'use client';
import { useEffect, useRef, useState } from 'react';
import { EmojiPicker } from '@/components/EmojiPicker/EmojiPicker';
import { formatReactorList, ReactionPill } from '@/components/ReactionPill/ReactionPill';
import { initialsForName } from '@/lib/avatar';
import styles from './Comment.module.css';

export interface CommentReaction {
  emoji: string;
  reactedBy: string[];
}

export interface CommentProps {
  /** Author display name. */
  author: string;
  /** Per-author color index 0..15 — drives avatar gradient. */
  colorIndex: number;
  /** Pre-formatted timestamp (e.g. "12/05 · 19:30"). */
  timestamp: string;
  /** Comment body — plain text in this release; markdown returns later. */
  body: string;
  /** Reactions on this comment. */
  reactions?: CommentReaction[];
  /** Whether the current user authored this comment — switches the actions
   *  slot to a kebab menu with Reply/Edit/Delete. */
  isOwn?: boolean;
  /** Current user's display name (for reaction toggle). */
  currentUser: string;
  /** Whether to render in "primary" mode (no head row; tighter padding).
   *  Primary is used when the comment is rendered as the AnnotationCard body. */
  variant?: 'reply' | 'primary';

  // Action callbacks
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReactionToggle?: (emoji: string) => void;
}

/**
 * Comment — one entry in an annotation's thread. Renders avatar +
 * author + timestamp + body + reactions row, with per-comment actions
 * on the right (reply icon for others, kebab menu for own).
 *
 * The `primary` variant skips the head row entirely — the author is
 * already shown in the parent AnnotationCard's meta. See spec §9.
 */
export function Comment({
  author,
  colorIndex,
  timestamp,
  body,
  reactions = [],
  isOwn = false,
  currentUser,
  variant = 'reply',
  onReply,
  onEdit,
  onDelete,
  onReactionToggle,
}: CommentProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [menuOpen]);

  const cls = [styles.comment, variant === 'primary' && styles.primary].filter(Boolean).join(' ');

  return (
    <article className={cls} data-author={author} data-own={isOwn ? '1' : undefined}>
      {variant === 'reply' ? (
        <header className={styles.head}>
          <div className={styles.by}>
            <span className={styles.avatar} data-color={colorIndex} aria-hidden="true">
              {initialsForName(author)}
            </span>
            <span className={styles.name}>{author}</span>
            <span className={styles.time}>{timestamp}</span>
          </div>
          <div ref={menuRef} className={styles.actions}>
            {isOwn ? (
              <>
                <button
                  type="button"
                  className={[styles.kebab, menuOpen && styles.menuOpen].filter(Boolean).join(' ')}
                  data-tooltip="More actions"
                  aria-label="More actions"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen ? 'true' : 'false'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((o) => !o);
                  }}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <circle cx="8" cy="3.5" r="1.2" />
                    <circle cx="8" cy="8" r="1.2" />
                    <circle cx="8" cy="12.5" r="1.2" />
                  </svg>
                </button>
                <div
                  className={[styles.menu, menuOpen && styles.open].filter(Boolean).join(' ')}
                  role="menu"
                >
                  <button
                    type="button"
                    className={styles.menuItem}
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onReply?.();
                    }}
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path d="M6 3.5v3H3.5l-.5.5v2L3 9.5l4 4 .708-.707L4.207 9.5H9v-2H4.207l3.5-3.5L7 3.293 5.5 4.793 6 3.5z" />
                    </svg>
                    Reply
                  </button>
                  <button
                    type="button"
                    className={styles.menuItem}
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit?.();
                    }}
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path d="M13.23 1h-1.46L3.52 9.25l-.16.22L1 13.59 2.41 15l4.12-2.36.22-.16L15 4.23V2.77L13.23 1zM13 4l-7 7L5 10l7-7 1 1z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    type="button"
                    className={[styles.menuItem, styles.danger].join(' ')}
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete?.();
                    }}
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path d="M10 3h3v1h-1v9l-1 1H4l-1-1V4H2V3h3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1zM9 2H6v1h3V2zM4 13h7V4H4v9z" />
                    </svg>
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className={styles.action}
                data-tooltip={`Reply to ${author}`}
                aria-label={`Reply to ${author}`}
                onClick={onReply}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M6 3.5v3H3.5l-.5.5v2L3 9.5l4 4 .708-.707L4.207 9.5H9v-2H4.207l3.5-3.5L7 3.293 5.5 4.793 6 3.5z" />
                </svg>
              </button>
            )}
          </div>
        </header>
      ) : null}

      <div className={styles.body}>{body}</div>

      <footer className={styles.reactions}>
        {reactions.map((r) => (
          <ReactionPill
            key={r.emoji}
            emoji={r.emoji}
            reactedBy={r.reactedBy}
            isCurrentUser={r.reactedBy.includes(currentUser)}
            onClick={(e) => {
              e.stopPropagation();
              onReactionToggle?.(r.emoji);
            }}
          />
        ))}
        <EmojiPicker onPick={(emoji) => onReactionToggle?.(emoji)} />
      </footer>
    </article>
  );
}

// Re-export the format helper so consumers can build matching tooltips.
export { formatReactorList };
