'use client';
import { useState } from 'react';
import { VscAdd, VscCopy, VscKey, VscTrash } from 'react-icons/vsc';
import { AppMain } from '@/components/AppMain/AppMain';
import { useConfirm } from '@/components/ConfirmDialog';
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
  // Styled Radix alert replaces the native `window.confirm` ban — see
  // `docs/code-style.md § Never use native browser dialogs`.
  const { confirm, dialog: confirmDialog } = useConfirm();

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

  async function onRevoke(id: string, tokenName: string) {
    const ok = await confirm({
      title: 'Revoke agent token',
      description: `"${tokenName}" will lose API access immediately. Any client using it will start receiving 401 errors. This cannot be undone.`,
      confirmLabel: 'Revoke',
      danger: true,
    });
    if (!ok) return;
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
    <AppMain variant="centered" className={styles.page} ariaLabel="Agent tokens settings">
      {confirmDialog}
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
            <VscAdd size={14} aria-hidden="true" /> New Token
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
                  <VscKey size={16} aria-hidden="true" />
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
                    <VscCopy size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Revoke token ${t.name}`}
                    title="Revoke"
                    onClick={() => onRevoke(t.id, t.name)}
                    className={styles.danger}
                  >
                    <VscTrash size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppMain>
  );
}
