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
  const dots = '•'.repeat(12);
  return lastFour ? `${prefix}${dots}${lastFour}` : `${prefix}${dots}`;
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.351 1.091a4.528 4.528 0 0 1 3.44 3.16c.215.724.247 1.49.093 2.23a4.583 4.583 0 0 1-4.437 3.6c-.438 0-.874-.063-1.293-.19l-.8.938-.379.175H7v1.5l-.5.5H5v1.5l-.5.5h-3l-.5-.5v-2.307l.146-.353L6.12 6.87a4.464 4.464 0 0 1-.2-1.405 4.528 4.528 0 0 1 5.431-4.375zm1.318 7.2a3.568 3.568 0 0 0 1.239-2.005l.004.005A3.543 3.543 0 0 0 9.72 2.08a3.576 3.576 0 0 0-2.8 3.4c-.01.456.07.908.239 1.33l-.11.543L2 12.404v1.6h2v-1.5l.5-.5H6v-1.5l.5-.5h1.245l.876-1.016.561-.14a3.47 3.47 0 0 0 1.269.238 3.568 3.568 0 0 0 2.218-.795zm-.838-2.732a1 1 0 1 0-1.662-1.11 1 1 0 0 0 1.662 1.11z"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 4l1-1h5.414L14 6.586V14l-1 1H5l-1-1V4zm9 3l-3-3H5v10h8V7z"
      />
      <path fillRule="evenodd" clipRule="evenodd" d="M3 1L2 2v10l1 1V2h6.414l-1-1H3z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M10 6H9V12H10V6Z" />
      <path d="M7 6H6V12H7V6Z" />
      <path d="M13 3H11V2C11 1.73478 10.8947 1.48038 10.7072 1.29285C10.5196 1.10531 10.2652 1 10 1L6 1C5.73478 1 5.48038 1.10531 5.29285 1.29285C5.10531 1.48038 5 1.73478 5 2V3H2V4H3V14L4 15H12L13 14V4H14V3H13ZM6 2H10V3H6V2ZM12 14H4V4H12V14Z" />
    </svg>
  );
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
      /* clipboard unavailable / denied — silently no-op for now. */
    }
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Agent Tokens</h1>
      <p className={styles.subtitle}>
        API tokens for agent integrations. Create, copy and revoke tokens.
      </p>

      {revealed && (
        <div role="alert" className={styles.reveal}>
          <span className={styles.revealLabel}>
            Token created — copy now, it won&apos;t be shown again
          </span>
          <div className={styles.revealRow}>
            <code className={styles.revealCode}>{revealed.plaintext}</code>
            <button
              type="button"
              onClick={handleCopyRevealed}
              className={`${styles.revealCopyBtn}${copied ? ` ${styles.copied}` : ''}`}
              aria-label={`Copy token ${revealed.name}`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <section className={styles.form}>
          <div className={styles.formLabel}>New token</div>
          <form onSubmit={onCreate} className={styles.formRow}>
            <input
              id="token-name"
              required
              pattern="[A-Za-z0-9_-]+"
              minLength={1}
              maxLength={64}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. claude-code-prod, ci-builder, designer-bot"
              className={styles.formInput}
              aria-label="Token name"
            />
            <button type="submit" disabled={busy} className={styles.btnAction}>
              {busy ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
                setName('');
              }}
              className={styles.btnCancel}
            >
              Cancel
            </button>
          </form>
          {error && <p className={styles.formError}>{error}</p>}
        </section>
      )}

      <div className={styles.tokensHeader}>
        <span className={styles.tokensCount}>
          {tokens.length} {tokens.length === 1 ? 'token' : 'tokens'}
        </span>
        {!showForm && (
          <button type="button" className={styles.btnAction} onClick={() => setShowForm(true)}>
            <PlusIcon /> New Token
          </button>
        )}
      </div>

      {tokens.length === 0 ? (
        <div className={styles.empty}>
          No tokens yet — create one to authorize a non-browser agent against the API.
        </div>
      ) : (
        <div className={styles.list}>
          {tokens.map((t) => {
            const masked = maskedPreview(t.prefix, t.lastFour);
            return (
              <div key={t.id} className={styles.card}>
                <div className={styles.keyIcon} aria-hidden="true">
                  <KeyIcon />
                </div>
                <div className={styles.body}>
                  <h3 className={styles.name}>{t.name}</h3>
                  <p className={styles.meta}>
                    Created {relTime(t.createdAt)} · Last used{' '}
                    {t.lastUsedAt ? relTime(t.lastUsedAt) : 'never'}
                  </p>
                  <div className={styles.masked}>{masked}</div>
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    aria-label={`Copy token ${t.name}`}
                    title="Copy"
                    onClick={() => copyToken(masked)}
                  >
                    <CopyIcon />
                  </button>
                  <button
                    type="button"
                    aria-label={`Revoke token ${t.name}`}
                    title="Revoke"
                    onClick={() => onRevoke(t.id, t.name)}
                    className={styles.danger}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
