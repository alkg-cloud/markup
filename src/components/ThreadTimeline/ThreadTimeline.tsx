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
}

export function ThreadTimeline({ annotationId: _annotationId, threadId, status, messages }: Props) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

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

  return (
    <aside
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-md)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 400,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 14 }}>Thread</h2>
        <span
          data-testid="thread-status"
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            color: status === 'resolved' ? 'var(--success)' : 'var(--warning)',
          }}
        >
          {status}
        </span>
      </header>

      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {messages.map((m) => (
          <li
            key={m.id}
            style={{
              borderLeft: `2px solid ${m.authorType === 'agent' ? 'var(--accent)' : 'var(--border-accent)'}`,
              paddingLeft: 12,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {m.authorType} · {new Date(m.createdAt).toLocaleString()}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', marginTop: 2 }}>{m.body}</div>
          </li>
        ))}
      </ol>

      <textarea
        placeholder="Reply…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        style={{
          width: '100%',
          padding: 8,
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-sm)',
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <button
          type="button"
          onClick={toggleResolve}
          disabled={busy || !threadId}
          data-testid="thread-resolve"
          style={{
            padding: '6px 12px',
            background: 'transparent',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          {status === 'resolved' ? 'Reopen' : 'Resolve'}
        </button>
        <button
          type="button"
          onClick={reply}
          disabled={busy || !body.trim() || !threadId}
          style={{
            padding: '6px 12px',
            background: 'var(--accent)',
            color: '#fff',
            border: 0,
            borderRadius: 'var(--radius-sm)',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy || !body.trim() ? 0.5 : 1,
          }}
        >
          Reply
        </button>
      </div>
    </aside>
  );
}
