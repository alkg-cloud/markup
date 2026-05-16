'use client';
import { useState } from 'react';
import styles from './AgentsClient.module.css';

interface AgentToken {
  id: string;
  name: string;
  prefix: string | null;
  lastFour: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

interface CreatedToken {
  id: string;
  name: string;
  plaintext: string;
}

function relTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

function maskedPreview(prefix: string | null, lastFour: string | null): string {
  if (!prefix) {
    return 'mk_•••••••••••••';
  }
  const dots = '•'.repeat(7);
  return lastFour ? `${prefix}${dots}${lastFour}` : `${prefix}${dots}`;
}

export function AgentsClient({
  initialTokens,
  initial,
}: {
  initialTokens?: AgentToken[];
  /** @deprecated use initialTokens */
  initial?: AgentToken[];
}) {
  const startTokens = initialTokens ?? initial ?? [];
  const [tokens, setTokens] = useState<AgentToken[]>(startTokens);
  const [showForm, setShowForm] = useState(false);
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
    setShowForm(false);
    await refresh();
  }

  async function onRevoke(id: string, _tokenName: string) {
    if (!confirm('Revoke this agent token? Any client using it will lose access immediately.'))
      return;
    await fetch(`/api/agent-tokens/${id}`, { method: 'DELETE' });
    if (revealed?.id === id) setRevealed(null);
    await refresh();
  }

  function handleCopyRevealed() {
    if (!revealed) return;
    void navigator.clipboard.writeText(revealed.plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function copyToken(masked: string) {
    try {
      await navigator.clipboard.writeText(masked);
    } catch {
      // clipboard unavailable / denied — silently no-op for now.
    }
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
          Agent Tokens
        </h1>
        <p
          style={{
            margin: 'var(--space-xs) 0 0',
            fontSize: 'var(--type-md)',
            color: 'var(--text-dim)',
            lineHeight: 'var(--leading-normal)',
          }}
        >
          API tokens for agent integrations. Create, copy and revoke tokens.
        </p>
      </div>

      {/* Plaintext token reveal (shown after creation) */}
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
              onClick={handleCopyRevealed}
              className={`ac-btn-copy${copied ? ' copied' : ''}`}
              style={{ color: copied ? 'var(--success)' : 'var(--accent)' }}
              aria-label={`Copy token ${revealed.name}`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Inline new-token form */}
      {showForm && (
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
          <div
            style={{
              fontSize: 'var(--type-2xs)',
              fontWeight: 700,
              letterSpacing: 'var(--tracking-wider)',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
            }}
          >
            New token
          </div>
          <form
            onSubmit={onCreate}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
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
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 24px',
                background: 'var(--accent)',
                color: 'var(--accent-foreground, white)',
                border: 0,
                borderRadius: 'var(--radius-pill)',
                fontSize: 'var(--type-sm)',
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.5 : 1,
              }}
            >
              {busy ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
                setName('');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 16px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-pill)',
                fontSize: 'var(--type-sm)',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
                color: 'var(--text-dim)',
              }}
            >
              Cancel
            </button>
          </form>
          {error && (
            <p
              role="alert"
              style={{ margin: 0, color: 'var(--danger)', fontSize: 'var(--type-sm)' }}
            >
              {error}
            </p>
          )}
        </section>
      )}

      {/* Token list */}
      <section>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <span
            style={{
              fontSize: 'var(--type-sm)',
              fontWeight: 600,
              color: 'var(--text-dim)',
            }}
          >
            {tokens.length} {tokens.length === 1 ? 'token' : 'tokens'}
          </span>
          {!showForm && (
            <button type="button" className={styles.newBtn} onClick={() => setShowForm(true)}>
              + New Token
            </button>
          )}
        </div>

        {tokens.length === 0 ? (
          <div className={styles.empty}>
            No tokens yet — create one to authorize a non-browser agent against the API.
          </div>
        ) : (
          <div className={styles.list}>
            {tokens.map((t) => (
              <div key={t.id} className={styles.card}>
                <div className={styles.keyIcon}>🔑</div>
                <div className={styles.body}>
                  <h3 className={styles.name}>{t.name}</h3>
                  <p className={styles.meta}>
                    Created {relTime(t.createdAt)} · Last used{' '}
                    {t.lastUsedAt ? relTime(t.lastUsedAt) : 'never'}
                  </p>
                  <div className={styles.masked}>{maskedPreview(t.prefix, t.lastFour)}</div>
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    aria-label={`Copy token ${t.name}`}
                    title="Copy"
                    onClick={() => copyToken(maskedPreview(t.prefix, t.lastFour))}
                  >
                    📋
                  </button>
                  <button
                    type="button"
                    aria-label={`Revoke token ${t.name}`}
                    title="Revoke"
                    onClick={() => onRevoke(t.id, t.name)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
