'use client';

import { useState } from 'react';
import styles from './DemoRail.module.css';
import type { DemoAnnotation, DemoMessage, DemoReaction, DemoThread, ThreadStatus } from './types';

type Props = {
  annotations: DemoAnnotation[];
  threads: DemoThread[];
  messages: DemoMessage[];
  reactions: DemoReaction[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCycleStatus: (threadId: string) => void;
  onToggleReaction: (threadId: string, emoji: string) => void;
  onAddReply: (threadId: string, body: string) => void;
};

const COMMON_EMOJIS = ['👍', '🔥', '✅', '🙌', '👀', '🚀'];

const STATUS_CLASS: Record<ThreadStatus, string> = {
  open: 'statusOpen',
  'needs review': 'statusReview',
  resolved: 'statusResolved',
};

export function DemoRail({
  annotations,
  threads,
  messages,
  reactions,
  selectedId,
  onSelect,
  onCycleStatus,
  onToggleReaction,
  onAddReply,
}: Props) {
  return (
    <div role="listbox" className={styles.rail} aria-label="Annotations" aria-live="polite">
      {annotations.map((a, idx) => {
        const thread = threads.find((t) => t.id === a.threadId);
        if (!thread) return null;
        const threadMsgs = messages.filter((m) => m.threadId === thread.id);
        const replyCount = Math.max(0, threadMsgs.length - 1);
        const threadReactions = reactions.filter((r) => r.threadId === thread.id);
        const selected = a.id === selectedId;
        return (
          <div
            key={a.id}
            role="option"
            aria-selected={selected}
            className={`${styles.annot} ${selected ? styles.selected : ''}`}
            onClick={() => onSelect(a.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(a.id);
              }
            }}
            tabIndex={0}
            aria-label={`Annotation ${idx + 1}`}
          >
            <div className={styles.header}>
              <span className={`${styles.num} ${styles[`color${a.colorIndex}`]}`}>{idx + 1}</span>
              <button
                type="button"
                className={`${styles.status} ${styles[STATUS_CLASS[thread.status]]}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onCycleStatus(thread.id);
                }}
                aria-label={`Status: ${thread.status} — click to cycle`}
              >
                {thread.status}
              </button>
              <span className={styles.meta}>
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </span>
            </div>
            <p className={styles.body}>{threadMsgs[0]?.body ?? ''}</p>
            <div className={styles.footer}>
              {threadReactions.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  className={`${styles.reaction} ${r.mine ? styles.reactionMine : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleReaction(thread.id, r.emoji);
                  }}
                  aria-pressed={r.mine}
                >
                  <span aria-hidden="true">{r.emoji}</span>
                  {r.count}
                </button>
              ))}
              <ReactionAdder threadId={thread.id} onPick={onToggleReaction} />
            </div>
            {selected && (
              <ReplyInput threadId={thread.id} onSubmit={(body) => onAddReply(thread.id, body)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReactionAdder({
  threadId,
  onPick,
}: {
  threadId: string;
  onPick: (tid: string, emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className={styles.adderWrap}>
      <button
        type="button"
        className={styles.adder}
        aria-label="Add reaction"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        +
      </button>
      {open && (
        <div
          role="menu"
          className={styles.adderMenu}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {COMMON_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className={styles.adderEmoji}
              onClick={() => {
                onPick(threadId, e);
                setOpen(false);
              }}
              aria-label={`React with ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

function ReplyInput({
  threadId,
  onSubmit,
}: {
  threadId: string;
  onSubmit: (body: string) => void;
}) {
  const [body, setBody] = useState('');
  return (
    <form
      className={styles.reply}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        onSubmit(body);
        setBody('');
      }}
    >
      <input
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Reply..."
        aria-label={`Reply on thread ${threadId}`}
      />
      <button type="submit" disabled={!body.trim()}>
        Send
      </button>
    </form>
  );
}
