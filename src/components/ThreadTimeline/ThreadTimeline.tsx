'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from './ThreadTimeline.module.css';

interface Message {
  id: string;
  authorType: string;
  authorId: string;
  body: string;
  createdAt: string;
}

interface Props {
  annotationId: string;
  threadId: string | null;
  status: string;
  messages: Message[];
  /** Resolved display names by authorId, pre-fetched server-side. */
  authorNamesById?: Record<string, string>;
}

const cx = (...classes: (string | false | undefined | null)[]) => classes.filter(Boolean).join(' ');

export function ThreadTimeline({
  annotationId: _annotationId,
  threadId,
  status,
  messages,
  authorNamesById = {},
}: Props) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  function getAuthorName(m: Message): string {
    if (authorNamesById[m.authorId]) return authorNamesById[m.authorId];
    return m.authorType === 'agent' ? 'Agent' : 'User';
  }

  async function reply() {
    if (!threadId || !body.trim() || busy) return;
    setBusy(true);
    try {
      await fetch(`/api/threads/${threadId}/reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      setBody('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleResolve() {
    if (!threadId || busy) return;
    setBusy(true);
    try {
      await fetch(`/api/threads/${threadId}/${status === 'resolved' ? 'reopen' : 'resolve'}`, {
        method: 'POST',
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const isResolved = status === 'resolved';

  return (
    <aside className={styles.aside}>
      {/* Thread header */}
      <div className={styles.header}>
        <span className={styles.headerLabel}>Thread</span>

        {/* Status pill with dot */}
        <span
          data-testid="thread-status"
          className={cx(
            styles.statusPill,
            isResolved ? styles.statusPillResolved : styles.statusPillOpen,
          )}
        >
          <span className={styles.statusDot} />
          {isResolved ? 'Resolved' : 'Open'}
        </span>
      </div>

      {/* Messages */}
      <ol className={styles.messageList}>
        {messages.map((m) => {
          const isAgent = m.authorType === 'agent';
          const authorName = getAuthorName(m);
          const avatarLetter = authorName.charAt(0).toUpperCase();

          return (
            <li key={m.id} className={styles.messageRow}>
              {/* Avatar */}
              <div
                className={cx(styles.avatar, isAgent ? styles.avatarAgent : styles.avatarUser)}
                aria-hidden="true"
              >
                {avatarLetter}
              </div>

              {/* Body column */}
              <div className={styles.messageBody}>
                {/* Author row */}
                <div className={styles.authorRow}>
                  <span className={styles.authorName}>{authorName}</span>
                  <time dateTime={m.createdAt} className={cx('tnum', styles.timestamp)}>
                    {new Date(m.createdAt).toLocaleString()}
                  </time>
                  {/* Kind chip — agent only */}
                  {isAgent && <span className={styles.kindChip}>agent</span>}
                </div>

                {/* Message text */}
                <div
                  className={cx(styles.messageText, isAgent && styles.messageTextAgent)}
                >
                  {m.body}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Reply form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void reply();
        }}
        className={styles.form}
      >
        <textarea
          placeholder="Reply…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={styles.textarea}
        />

        {/* Action row */}
        <div className={styles.actions}>
          {/* Resolve / Reopen — ghost */}
          <button
            type="button"
            onClick={toggleResolve}
            disabled={busy || !threadId}
            data-testid="thread-resolve"
            className={styles.btnGhost}
          >
            {isResolved ? 'Reopen' : 'Resolve'}
          </button>

          {/* Reply primary */}
          <button
            type="submit"
            disabled={busy || !body.trim() || !threadId}
            className={styles.btnPrimary}
          >
            Reply →
          </button>
        </div>
      </form>
    </aside>
  );
}
