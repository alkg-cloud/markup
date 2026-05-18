'use client';
import { type FormEvent, useState } from 'react';
import { Comment, type CommentReaction } from '@/components/Comment/Comment';
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

  onActivate?: () => void;
  onPostReply?: (body: string) => void;
  onCommentReply?: (commentId: string) => void;
  onCommentEdit?: (commentId: string) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentReact?: (commentId: string, emoji: string) => void;
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
  onActivate,
  onPostReply,
  onCommentReply,
  onCommentEdit,
  onCommentDelete,
  onCommentReact,
}: AnnotationCardProps) {
  const [threadOpen, setThreadOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');

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
            setThreadOpen((o) => !o);
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
            onReply={() => onCommentReply?.(r.id)}
            onEdit={() => onCommentEdit?.(r.id)}
            onDelete={() => onCommentDelete?.(r.id)}
            onReactionToggle={(emoji) => onCommentReact?.(r.id, emoji)}
          />
        ))}
      </section>
    </li>
  );
}
