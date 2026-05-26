'use client';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { VscEdit, VscKebabVertical, VscReply, VscTrash } from 'react-icons/vsc';
import { EmojiPicker } from '@/components/EmojiPicker/EmojiPicker';
import { ReactionPill } from '@/components/ReactionPill/ReactionPill';
import { initialsForName } from '@/lib/avatar';
import { usePopover } from '@/lib/popover/usePopover';
import { isMod } from '@/lib/shortcuts/platform';
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
  /** Inline edit mode — replaces the body div with a styled textarea +
   *  save/cancel affordances. Owned by the parent (AnnotationCard) so
   *  only one comment is in edit mode at a time. */
  isEditing?: boolean;
  /** Save the textarea's current value. The parent persists to the
   *  server and dismisses the editor. */
  onEditSave?: (newBody: string) => void;
  /** Discard the draft and exit edit mode. */
  onEditCancel?: () => void;

  // Action callbacks
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReactionToggle?: (emoji: string) => void;
  /** Whether the current viewer is an admin — they can delete others' comments (not edit). */
  viewerIsAdmin?: boolean;
  /** When true, suppresses every mutation surface: the kebab menu trigger
   *  and the Add-reaction trigger do not render; existing reaction pills
   *  remain visible but are non-toggleable. Used by historic version viewing. */
  readOnly?: boolean;
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
  isEditing = false,
  onEditSave,
  onEditCancel,
  onReply,
  onEdit,
  onDelete,
  onReactionToggle,
  viewerIsAdmin = false,
  readOnly = false,
}: CommentProps) {
  // Kebab popover is browser-managed (HTML popover="auto" — top-layer
  // paint + light dismiss + ESC). `close()` is called on menu-item
  // click so the action fires + popover dismisses in one gesture.
  const kebabPopover = usePopover<HTMLButtonElement, HTMLDivElement>('right');
  // Edit-mode draft. Reset whenever the editor opens with a fresh body so
  // re-entering edit after a save shows the canonical (saved) text.
  const [draft, setDraft] = useState(body);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (isEditing) {
      setDraft(body);
      // Focus + place cursor at end on the next tick so the user can keep
      // typing without manually clicking the textarea.
      const t = window.setTimeout(() => {
        const ta = editTextareaRef.current;
        if (!ta) return;
        ta.focus();
        const len = ta.value.length;
        ta.setSelectionRange(len, len);
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [isEditing, body]);
  const commitEdit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === body) {
      onEditCancel?.();
      return;
    }
    onEditSave?.(trimmed);
  };
  const onEditKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onEditCancel?.();
    } else if (e.key === 'Enter' && isMod(e)) {
      e.preventDefault();
      commitEdit();
    }
  };

  const cls = [styles.comment, variant === 'primary' && styles.primary, isEditing && styles.editing]
    .filter(Boolean)
    .join(' ');

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
          <div className={styles.actions}>
            {!readOnly &&
              (isOwn || viewerIsAdmin ? (
                <>
                  <button
                    ref={kebabPopover.triggerRef}
                    type="button"
                    className={styles.kebab}
                    data-tooltip="More actions"
                    aria-label="More actions"
                    aria-haspopup="menu"
                    {...kebabPopover.triggerProps}
                  >
                    <VscKebabVertical aria-hidden="true" />
                  </button>
                  <div {...kebabPopover.popoverProps} className={styles.menu} role="menu">
                    <button
                      type="button"
                      className={styles.menuItem}
                      role="menuitem"
                      onClick={() => {
                        kebabPopover.close();
                        onReply?.();
                      }}
                    >
                      <VscReply aria-hidden="true" />
                      Reply
                    </button>
                    {/* Edit is own-only — admins can delete but not edit others' comments. */}
                    {isOwn && (
                      <button
                        type="button"
                        className={styles.menuItem}
                        role="menuitem"
                        onClick={() => {
                          kebabPopover.close();
                          onEdit?.();
                        }}
                      >
                        <VscEdit aria-hidden="true" />
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      className={[styles.menuItem, styles.danger].join(' ')}
                      role="menuitem"
                      onClick={() => {
                        kebabPopover.close();
                        onDelete?.();
                      }}
                    >
                      <VscTrash aria-hidden="true" />
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
                  <VscReply aria-hidden="true" />
                </button>
              ))}
          </div>
        </header>
      ) : null}

      {isEditing && !readOnly ? (
        <div className={styles.editBody}>
          <textarea
            ref={editTextareaRef}
            className={styles.editTextarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={onEditKey}
            onClick={(e) => e.stopPropagation()}
            rows={3}
            aria-label="Edit comment"
          />
          <div className={styles.editActions}>
            <button
              type="button"
              className={styles.editCancel}
              // mousedown (not click) so it fires before the textarea's
              // blur — otherwise blur would commit before cancel runs.
              onMouseDown={(e) => {
                e.preventDefault();
                onEditCancel?.();
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.editSave}
              onMouseDown={(e) => {
                e.preventDefault();
                commitEdit();
              }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.body}>{body}</div>
      )}

      <footer className={styles.reactions} data-empty={reactions.length === 0 ? 'true' : undefined}>
        {reactions.map((r) => (
          <ReactionPill
            key={r.emoji}
            emoji={r.emoji}
            reactedBy={r.reactedBy}
            isCurrentUser={r.reactedBy.includes(currentUser)}
            onClick={
              readOnly
                ? undefined
                : (e) => {
                    e.stopPropagation();
                    onReactionToggle?.(r.emoji);
                  }
            }
          />
        ))}
        {!readOnly && <EmojiPicker onPick={(emoji) => onReactionToggle?.(emoji)} />}
      </footer>
    </article>
  );
}
