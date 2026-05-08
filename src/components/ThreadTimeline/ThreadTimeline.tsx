'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
        minHeight: 400,
      }}
    >
      <style>{`
        .tt-btn-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          padding: 9px 16px;
          background: transparent;
          color: var(--text);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-pill);
          font-size: var(--type-xs);
          font-weight: 700;
          font-family: inherit;
          transition:
            background var(--motion-fast) var(--ease-standard),
            border-color var(--motion-fast) var(--ease-standard),
            color var(--motion-fast) var(--ease-standard),
            transform var(--motion-instant) var(--ease-standard);
        }
        .tt-btn-ghost:hover:not(:disabled) {
          background: var(--surface-hover);
          border-color: var(--border-strong);
          color: var(--text-bright);
        }
        .tt-btn-ghost:active:not(:disabled) {
          background: var(--surface-active);
          transform: translateY(1px);
        }
        .tt-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

        .tt-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          padding: 9px 16px;
          background: var(--btn-bg);
          color: var(--accent);
          border: 0;
          border-radius: var(--radius-pill);
          font-size: var(--type-xs);
          font-weight: 700;
          font-family: inherit;
          transition:
            background var(--motion-fast) var(--ease-standard),
            transform var(--motion-instant) var(--ease-standard),
            opacity var(--motion-fast) var(--ease-standard);
        }
        .tt-btn-primary:hover:not(:disabled) { background: var(--btn-bg-hover); }
        .tt-btn-primary:active:not(:disabled) { background: var(--btn-bg-active); transform: translateY(1px); }
        .tt-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
      {/* Thread header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 'var(--space-sm)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--type-2xs)',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-wider)',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
          }}
        >
          Thread
        </span>

        {/* Status pill with dot */}
        <span
          data-testid="thread-status"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 'var(--type-2xs)',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-wide)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-pill)',
            textTransform: 'uppercase',
            background: isResolved ? 'var(--success-soft)' : 'var(--info-soft)',
            color: isResolved ? 'var(--success)' : 'var(--info)',
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'currentColor',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          {isResolved ? 'Resolved' : 'Open'}
        </span>
      </div>

      {/* Messages */}
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gap: 'var(--space-md)',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {messages.map((m) => {
          const isAgent = m.authorType === 'agent';
          const authorName = getAuthorName(m);
          const avatarLetter = authorName.charAt(0).toUpperCase();

          return (
            <li
              key={m.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr',
                gap: 'var(--space-sm)',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: 11,
                  fontWeight: 700,
                  background: isAgent ? 'var(--accent-soft)' : 'var(--info-soft)',
                  color: isAgent ? 'var(--accent)' : 'var(--info)',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {avatarLetter}
              </div>

              {/* Body column */}
              <div style={{ display: 'grid', gap: 4 }}>
                {/* Author row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 'var(--space-xs)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--type-xs)',
                      fontWeight: 700,
                      color: 'var(--text-bright)',
                    }}
                  >
                    {authorName}
                  </span>
                  <time
                    dateTime={m.createdAt}
                    className="tnum"
                    style={{
                      fontSize: 'var(--type-2xs)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {new Date(m.createdAt).toLocaleString()}
                  </time>
                  {/* Kind chip — agent only */}
                  {isAgent && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 'var(--tracking-wide)',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-pill)',
                        textTransform: 'uppercase',
                        background: 'var(--bg-chip)',
                        color: 'var(--text-dim)',
                      }}
                    >
                      agent
                    </span>
                  )}
                </div>

                {/* Message text */}
                <div
                  style={{
                    fontSize: 'var(--type-sm)',
                    color: 'var(--text)',
                    lineHeight: 'var(--leading-snug)',
                    whiteSpace: 'pre-wrap',
                    ...(isAgent
                      ? {
                          paddingLeft: 'var(--space-sm)',
                          borderLeft: '2px solid oklch(74.4% 0.193 165 / 0.35)',
                        }
                      : {}),
                  }}
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
        style={{ display: 'grid', gap: 'var(--space-sm)' }}
      >
        <textarea
          placeholder="Reply…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{
            width: '100%',
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--surface-input)',
            color: 'var(--text-bright)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            font: 'inherit',
            fontSize: 'var(--type-base)',
            minHeight: 64,
            resize: 'vertical',
          }}
        />

        {/* Action row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Resolve / Reopen — ghost */}
          <button
            type="button"
            onClick={toggleResolve}
            disabled={busy || !threadId}
            data-testid="thread-resolve"
            className="tt-btn-ghost"
            style={{ cursor: busy || !threadId ? 'not-allowed' : 'pointer' }}
          >
            {isResolved ? 'Reopen' : 'Resolve'}
          </button>

          {/* Reply primary */}
          <button
            type="submit"
            disabled={busy || !body.trim() || !threadId}
            className="tt-btn-primary"
            style={{ cursor: busy || !body.trim() || !threadId ? 'not-allowed' : 'pointer' }}
          >
            Reply →
          </button>
        </div>
      </form>
    </aside>
  );
}
