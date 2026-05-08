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
  const [copied, setCopied] = useState(false);

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
    setCopied(false);
    setName('');
    await refresh();
  }

  async function onRevoke(id: string) {
    if (!confirm('Revoke this agent token? Any client using it will lose access immediately.'))
      return;
    await fetch(`/api/agent-tokens/${id}`, { method: 'DELETE' });
    await refresh();
  }

  function handleCopy() {
    if (!revealed) return;
    void navigator.clipboard.writeText(revealed.plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <main
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: 'var(--space-3xl) var(--space-xl)',
        display: 'grid',
        gap: 'var(--space-2xl)',
      }}
    >
      <style>{`
        .ac-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 24px;
          background: var(--btn-bg);
          color: var(--accent);
          border: 0;
          border-radius: var(--radius-pill);
          font-size: var(--type-sm);
          font-weight: 700;
          font-family: inherit;
          white-space: nowrap;
          transition:
            background var(--motion-fast) var(--ease-standard),
            transform var(--motion-instant) var(--ease-standard),
            opacity var(--motion-fast) var(--ease-standard);
        }
        .ac-btn-primary:hover:not(:disabled) { background: var(--btn-bg-hover); }
        .ac-btn-primary:active:not(:disabled) { background: var(--btn-bg-active); transform: translateY(1px); }
        .ac-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        @keyframes ac-copy-pulse {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .ac-btn-copy {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 9px 16px;
          background: var(--btn-bg);
          color: var(--accent);
          border: 0;
          border-radius: var(--radius-pill);
          cursor: pointer;
          font-size: var(--type-xs);
          font-weight: 700;
          font-family: inherit;
          flex-shrink: 0;
          transition:
            background var(--motion-fast) var(--ease-standard),
            color var(--motion-fast) var(--ease-standard),
            transform var(--motion-instant) var(--ease-standard);
        }
        .ac-btn-copy:hover { background: var(--btn-bg-hover); }
        .ac-btn-copy:active { background: var(--btn-bg-active); transform: translateY(1px); }
        .ac-btn-copy.copied {
          animation: ac-copy-pulse 200ms var(--ease-emphasized) forwards;
        }

        .ac-btn-revoke {
          padding: 5px 10px;
          font-size: var(--type-2xs);
          border-radius: var(--radius-pill);
          background: transparent;
          border: 1px solid oklch(40% 0.1 25);
          color: var(--danger);
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition:
            background var(--motion-fast) var(--ease-standard),
            transform var(--motion-instant) var(--ease-standard);
        }
        .ac-btn-revoke:hover { background: var(--danger-soft); }
        .ac-btn-revoke:active { background: oklch(32% 0.1 25); transform: scale(0.97); }

        .ac-token-input:focus-visible {
          outline: none;
          box-shadow: var(--focus-ring);
          border-color: var(--accent);
          border-radius: var(--radius-sm);
        }
      `}</style>
      {/* Page header */}
      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--type-3xl)',
            fontWeight: 700,
            color: 'var(--text-bright)',
            letterSpacing: 'var(--tracking-tighter)',
            lineHeight: 1.05,
          }}
        >
          Agent tokens
        </h1>
        <p
          style={{
            margin: 'var(--space-xs) 0 0',
            fontSize: 'var(--type-md)',
            color: 'var(--text-dim)',
            lineHeight: 'var(--leading-normal)',
          }}
        >
          Tokens authenticate non-browser clients — AI dev assistants, agent frameworks, CI
          integrations — against the API.
        </p>
      </div>

      {/* Create form card */}
      <section
        style={{
          background: 'var(--bg-elevated-soft)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-xl)',
          display: 'grid',
          gap: 'var(--space-md)',
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontSize: 'var(--type-2xs)',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-wider)',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
          }}
        >
          Create new token
        </div>

        {/* Field row: input + button */}
        <form
          onSubmit={onCreate}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 'var(--space-sm)',
            alignItems: 'end',
          }}
        >
          <div style={{ display: 'grid', gap: 6 }}>
            <label
              htmlFor="token-name"
              style={{
                fontSize: 'var(--type-2xs)',
                fontWeight: 700,
                letterSpacing: 'var(--tracking-wide)',
                textTransform: 'uppercase',
                color: 'var(--text-dim)',
              }}
            >
              Name
            </label>
            <input
              id="token-name"
              required
              pattern="[A-Za-z0-9_-]+"
              minLength={1}
              maxLength={64}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. claude-code-prod, ci-builder, designer-bot"
              style={{
                padding: '12px 16px',
                background: 'var(--surface-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-bright)',
                font: 'inherit',
                fontSize: 'var(--type-base)',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="ac-btn-primary"
            style={{ cursor: busy ? 'not-allowed' : 'pointer' }}
          >
            {busy ? 'Creating…' : 'Create →'}
          </button>
        </form>

        {error && (
          <p role="alert" style={{ margin: 0, color: 'var(--danger)', fontSize: 'var(--type-sm)' }}>
            {error}
          </p>
        )}

        {/* Plaintext token reveal */}
        {revealed && (
          <div
            role="alert"
            style={{
              background: 'var(--warning-soft)',
              borderLeft: '4px solid var(--warning)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              display: 'grid',
              gap: 'var(--space-xs)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--type-xs)',
                fontWeight: 700,
                letterSpacing: 'var(--tracking-wide)',
                textTransform: 'uppercase',
                color: 'var(--warning)',
              }}
            >
              ⚡ Token created — copy now, it won&apos;t be shown again
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
              }}
            >
              <code
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--type-sm)',
                  color: 'var(--text-bright)',
                  flex: 1,
                  wordBreak: 'break-all',
                }}
              >
                {revealed.plaintext}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className={`ac-btn-copy${copied ? ' copied' : ''}`}
                style={{ color: copied ? 'var(--success)' : 'var(--accent)' }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Existing tokens table */}
      <section
        style={{
          background: 'var(--bg-elevated-soft)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        {tokens.length === 0 ? (
          <p
            style={{
              margin: 0,
              padding: 'var(--space-2xl)',
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: 'var(--type-sm)',
            }}
          >
            No tokens yet — create one above to authorize a non-browser agent against the API.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {(['Name', 'Created', 'Last used', ''] as const).map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: 'left',
                      fontSize: 'var(--type-2xs)',
                      fontWeight: 700,
                      letterSpacing: 'var(--tracking-wider)',
                      textTransform: 'uppercase',
                      color: 'var(--text-dim)',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: 'var(--surface-soft)',
                      padding: 'var(--space-sm) var(--space-lg)',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id}>
                  <td
                    style={{
                      padding: 'var(--space-sm) var(--space-lg)',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: 'var(--type-sm)',
                      color: 'var(--text-bright)',
                      fontWeight: 600,
                    }}
                  >
                    {t.name}
                  </td>
                  <td
                    className="tnum"
                    style={{
                      padding: 'var(--space-sm) var(--space-lg)',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: 'var(--type-sm)',
                      color: 'var(--text-dim)',
                    }}
                  >
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                  <td
                    className="tnum"
                    style={{
                      padding: 'var(--space-sm) var(--space-lg)',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: 'var(--type-sm)',
                      color: 'var(--text-dim)',
                    }}
                  >
                    {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : 'never'}
                  </td>
                  <td
                    style={{
                      padding: 'var(--space-sm) var(--space-lg)',
                      borderBottom: '1px solid var(--border-subtle)',
                      textAlign: 'right',
                    }}
                  >
                    <button type="button" onClick={() => onRevoke(t.id)} className="ac-btn-revoke">
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
