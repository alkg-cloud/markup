'use client';
import { type FormEvent, useState } from 'react';
import {
  VscCircleLarge,
  VscCommentUnresolved,
  VscPass,
  VscReply,
} from 'react-icons/vsc';
import { Comment, type CommentReaction } from '@/components/Comment/Comment';
import { usePopover } from '@/lib/popover/usePopover';
import styles from './AnnotationCard.module.css';

export type AnnotationStatus = 'open' | 'needs review' | 'resolved';

export interface ThreadComment {
  id: string;
  author: string;
  authorColorIndex: number;
  isOwn?: boolean;
  timestamp: string;
  body: string;
  reactions?: CommentReaction[];
}

export interface AnnotationCardProps {
  annotationId: string;
  /** Numeric label inside the rail badge (the annotation number). */
  label: number | string;
  colorIndex: number;
  status: AnnotationStatus;
  /** Author of the annotation — surfaced in the meta row. */
  author: string;
  /** Pre-formatted date for the foot row (e.g. "12/05/2026 · 19:30"). */
  date: string;
  /** Primary comment — rendered as the card body (no head row). */
  primary: ThreadComment;
  /** Replies, newest-first. */
  replies?: ThreadComment[];
  /** Display name of the logged-in user (for reaction state). */
  currentUser: string;
  /** Whether this annotation is currently selected. */
  active?: boolean;
  /** Accordion: whether THIS card's reply thread is currently expanded.
   *  When omitted the card falls back to local state (legacy behaviour). */
  threadOpen?: boolean;
  /** Fired when the user toggles this card's thread (chevron click). */
  onThreadToggle?: () => void;

  onActivate?: () => void;
  onPostReply?: (body: string) => void;
  onCommentReply?: (commentId: string) => void;
  /** Persist an inline edit. Returns true on success so the card can
   *  dismiss the textarea and update local state via its parent. */
  onCommentEditSave?: (commentId: string, newBody: string) => void | Promise<void>;
  onCommentDelete?: (commentId: string) => void;
  onCommentReact?: (commentId: string, emoji: string) => void;
  /** Change this annotation's status from the primary kebab menu. */
  onAnnotationStatusChange?: (status: AnnotationStatus) => void | Promise<void>;
  /** Delete this annotation (cascades to its thread + reactions). */
  onAnnotationDelete?: () => void | Promise<void>;
}

/**
 * AnnotationCard — one row in the AnnotationsRail's expanded list.
 *
 * Header: badge + author + status pill + actions slot (kebab/reply).
 * Body: primary Comment (no fc-head).
 * Foot: date + chevron toggle.
 * Thread (chevron-toggled): reply textarea + Reply button + replies
 * (newest-first) each rendered as a Comment.
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §8.
 */
export function AnnotationCard({
  annotationId,
  label,
  colorIndex,
  status,
  author,
  date,
  primary,
  replies = [],
  currentUser,
  active = false,
  threadOpen: threadOpenProp,
  onThreadToggle,
  onActivate,
  onPostReply,
  onCommentReply,
  onCommentEditSave,
  onCommentDelete,
  onCommentReact,
  onAnnotationStatusChange,
  onAnnotationDelete,
}: AnnotationCardProps) {
  // Primary-comment kebab popover — surfaces status toggle + Edit +
  // Delete for annotations the current user authored. Browser-managed
  // via the HTML popover API (top-layer paint + light dismiss + ESC).
  const primaryKebab = usePopover<HTMLButtonElement, HTMLDivElement>('right');
  // Accordion-controlled when `threadOpen` is supplied by the parent;
  // otherwise the card manages its own state (preserves the previous
  // local-toggle behaviour for callers that don't lift state).
  const [threadOpenLocal, setThreadOpenLocal] = useState(false);
  const threadOpen = threadOpenProp ?? threadOpenLocal;
  const toggleThread = () => {
    if (onThreadToggle) onThreadToggle();
    else setThreadOpenLocal((o) => !o);
  };
  const [replyDraft, setReplyDraft] = useState('');
  // Track which comment is currently being edited inline. Only one at a
  // time so the textarea doesn't get cloned across primary + replies.
  const [editingId, setEditingId] = useState<string | null>(null);
  const startEdit = (commentId: string) => setEditingId(commentId);
  const cancelEdit = () => setEditingId(null);
  const saveEdit = async (commentId: string, newBody: string) => {
    await onCommentEditSave?.(commentId, newBody);
    setEditingId(null);
  };

  const pillClass =
    status === 'resolved'
      ? styles.resolved
      : status === 'needs review'
        ? styles.review
        : styles.open;

  const replyCount = replies.length;
  const replyCountLabel =
    replyCount === 0 ? 'No replies' : replyCount === 1 ? '1 reply' : `${replyCount} replies`;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = replyDraft.trim();
    if (!trimmed) return;
    onPostReply?.(trimmed);
    setReplyDraft('');
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard focus lands on the inner Comment button; the card-region click is a mouse-only shortcut to expand without moving focus.
    <li
      className={[styles.item, active && styles.active].filter(Boolean).join(' ')}
      data-pin-target={annotationId}
      data-color={colorIndex}
      onClick={onActivate}
    >
      <div className={styles.meta}>
        <span className={styles.num}>
          <span className={styles.badge} data-color={colorIndex}>
            {label}
          </span>
          <span className={styles.author}>{author}</span>
        </span>
        <span className={[styles.pill, pillClass].join(' ')}>{status}</span>
        {primary.isOwn ? (
          <div className={styles.primaryActions}>
            <button
              ref={primaryKebab.triggerRef}
              type="button"
              className={styles.primaryKebab}
              data-tooltip="Annotation actions"
              data-tooltip-align="right"
              aria-label="Annotation actions"
              aria-haspopup="menu"
              {...primaryKebab.triggerProps}
            >
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <circle cx="8" cy="3.5" r="1.2" />
                <circle cx="8" cy="8" r="1.2" />
                <circle cx="8" cy="12.5" r="1.2" />
              </svg>
            </button>
            <div {...primaryKebab.popoverProps} className={styles.primaryMenu} role="menu">
              <div className={styles.statusGroup} role="radiogroup" aria-label="Annotation status">
                {(
                  [
                    { value: 'open', label: 'Open', Icon: VscCircleLarge, slot: 'open' },
                    {
                      value: 'needs review',
                      label: 'Needs review',
                      Icon: VscCommentUnresolved,
                      slot: 'review',
                    },
                    { value: 'resolved', label: 'Resolved', Icon: VscPass, slot: 'resolved' },
                  ] as Array<{
                    value: AnnotationStatus;
                    label: string;
                    Icon: typeof VscPass;
                    slot: 'open' | 'review' | 'resolved';
                  }>
                ).map(({ value, label, Icon, slot }) => (
                  // biome-ignore lint/a11y/useSemanticElements: <input type="radio"> can't host the icon + tooltip pattern; the role is intentional and `aria-checked` is set.
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={status === value ? 'true' : 'false'}
                    aria-label={label}
                    data-tooltip={label}
                    data-status={slot}
                    className={[styles.statusOption, status === value && styles.statusOptionActive]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      primaryKebab.close();
                      if (status !== value) void onAnnotationStatusChange?.(value);
                    }}
                  >
                    <Icon aria-hidden="true" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.primaryMenuItem}
                role="menuitem"
                onClick={() => {
                  primaryKebab.close();
                  startEdit(primary.id);
                }}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M13.23 1h-1.46L3.52 9.25l-.16.22L1 13.59 2.41 15l4.12-2.36.22-.16L15 4.23V2.77L13.23 1zM13 4l-7 7L5 10l7-7 1 1z" />
                </svg>
                Edit
              </button>
              <button
                type="button"
                className={[styles.primaryMenuItem, styles.danger].join(' ')}
                role="menuitem"
                onClick={() => {
                  primaryKebab.close();
                  void onAnnotationDelete?.();
                }}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M10 3h3v1h-1v9l-1 1H4l-1-1V4H2V3h3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1zM9 2H6v1h3V2zM4 13h7V4H4v9z" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <Comment
        author={primary.author}
        colorIndex={primary.authorColorIndex}
        timestamp={primary.timestamp}
        body={primary.body}
        reactions={primary.reactions}
        isOwn={primary.isOwn}
        currentUser={currentUser}
        variant="primary"
        isEditing={editingId === primary.id}
        onEditSave={(body) => saveEdit(primary.id, body)}
        onEditCancel={cancelEdit}
        onReactionToggle={(emoji) => onCommentReact?.(primary.id, emoji)}
      />

      <div className={styles.foot}>
        <span>{date}</span>
        <button
          type="button"
          className={[styles.toggle, threadOpen && styles.open].filter(Boolean).join(' ')}
          aria-expanded={threadOpen ? 'true' : 'false'}
          aria-controls={`thread-${annotationId}`}
          data-tooltip={threadOpen ? `Hide ${replyCountLabel}` : `Show ${replyCountLabel}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleThread();
          }}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M14.5 2h-13l-.5.5v9l.5.5H4v2.5l.854.354L7.707 12H14.5l.5-.5v-9l-.5-.5z" />
          </svg>
          <span>{replyCountLabel}</span>
          <svg className={styles.chev} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M3.2 5.8h9.6L8 11.4z" />
          </svg>
        </button>
      </div>

      <section
        id={`thread-${annotationId}`}
        className={[styles.thread, threadOpen && styles.open].filter(Boolean).join(' ')}
      >
        <form className={styles.reply} onSubmit={onSubmit}>
          <textarea
            className={styles.replyInput}
            rows={2}
            placeholder="Reply to this annotation…"
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className={styles.replyFoot}>
            <button
              type="submit"
              className={styles.replyBtn}
              disabled={replyDraft.trim().length === 0}
            >
              <VscReply aria-hidden="true" />
              Reply
            </button>
          </div>
        </form>

        {replies.map((r) => (
          <Comment
            key={r.id}
            author={r.author}
            colorIndex={r.authorColorIndex}
            timestamp={r.timestamp}
            body={r.body}
            reactions={r.reactions}
            isOwn={r.isOwn}
            currentUser={currentUser}
            isEditing={editingId === r.id}
            onEditSave={(body) => saveEdit(r.id, body)}
            onEditCancel={cancelEdit}
            onReply={() => onCommentReply?.(r.id)}
            onEdit={() => startEdit(r.id)}
            onDelete={() => onCommentDelete?.(r.id)}
            onReactionToggle={(emoji) => onCommentReact?.(r.id, emoji)}
          />
        ))}
      </section>
    </li>
  );
}
