'use client';
import { useState } from 'react';

interface AgentToken {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface CreatedToken {
  id: string;
  name: string;
  plaintext: string;
}

export function AgentsClient({ initial }: { initial: AgentToken[] }) {
  const [tokens, setTokens] = useState<AgentToken[]>(initial);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<CreatedToken | null>(null);

  async function refresh() {
    const r = await fetch('/api/agent-tokens');
    if (!r.ok) return;
    const body = await r.json();
    setTokens(body.tokens);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch('/api/agent-tokens', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'unknown_error');
      return;
    }
    const created = await res.json();
    setRevealed(created);
    setName('');
    await refresh();
  }

  async function onRevoke(id: string) {
    if (!confirm('Revoke this agent token? Any client using it will lose access immediately.'))
      return;
    await fetch(`/api/agent-tokens/${id}`, { method: 'DELETE' });
    await refresh();
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Agent Tokens</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Tokens authenticate non-browser clients (e.g. Paperclip) against the API.
      </p>

      <section
        style={{
          marginTop: 24,
          padding: 16,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Create new token</h2>
        <form onSubmit={onCreate} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <label style={{ flex: 1 }}>
            Name
            <br />
            <input
              required
              pattern="[A-Za-z0-9_-]+"
              minLength={1}
              maxLength={64}
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                marginTop: 4,
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
              }}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: '8px 16px',
              background: 'var(--accent)',
              color: '#fff',
              border: 0,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            {busy ? 'Creating…' : 'Create'}
          </button>
        </form>
        {error && (
          <p role="alert" style={{ color: 'var(--danger)', marginTop: 8 }}>
            {error}
          </p>
        )}
      </section>

      {revealed && (
        <section
          style={{
            marginTop: 16,
            padding: 16,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--warning)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 16, color: 'var(--warning)' }}>
            Copy now — you will not see this token again
          </h2>
          <p style={{ marginBottom: 4 }}>
            Token <code>{revealed.name}</code>:
          </p>
          <pre
            style={{
              padding: 8,
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
              overflowX: 'auto',
              margin: 0,
            }}
          >
            {revealed.plaintext}
          </pre>
          <button
            type="button"
            onClick={() => {
              setRevealed(null);
            }}
            style={{
              marginTop: 8,
              padding: '6px 12px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            I've copied it
          </button>
        </section>
      )}

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Existing tokens ({tokens.length})</h2>
        {tokens.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No agent tokens yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: 8, borderBottom: '1px solid var(--border-primary)' }}>
                  Name
                </th>
                <th style={{ padding: 8, borderBottom: '1px solid var(--border-primary)' }}>
                  Created
                </th>
                <th style={{ padding: 8, borderBottom: '1px solid var(--border-primary)' }}>
                  Last used
                </th>
                <th style={{ padding: 8, borderBottom: '1px solid var(--border-primary)' }}></th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--border-primary)' }}>
                    {t.name}
                  </td>
                  <td
                    style={{
                      padding: 8,
                      borderBottom: '1px solid var(--border-primary)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: 8,
                      borderBottom: '1px solid var(--border-primary)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : 'never'}
                  </td>
                  <td
                    style={{
                      padding: 8,
                      borderBottom: '1px solid var(--border-primary)',
                      textAlign: 'right',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onRevoke(t.id)}
                      style={{
                        padding: '4px 8px',
                        background: 'transparent',
                        color: 'var(--danger)',
                        border: '1px solid var(--danger)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
