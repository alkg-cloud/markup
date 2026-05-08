'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/* ─── Shared style objects ─────────────────────────────────────────────────── */

const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
};

const labelTextStyle: React.CSSProperties = {
  fontSize: 'var(--type-2xs)',
  fontWeight: 'var(--weight-bold)',
  letterSpacing: 'var(--tracking-wide)',
  textTransform: 'uppercase',
  color: 'var(--text-dim)',
};

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    background: 'var(--surface-input)',
    color: 'var(--text-bright)',
    border: `1px solid ${hasError ? 'var(--danger)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--type-base)',
    lineHeight: 'var(--leading-normal)',
    transition:
      'border-color var(--motion-fast) var(--ease-standard), background var(--motion-fast) var(--ease-standard)',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-body)',
  };
}

const fieldErrorStyle: React.CSSProperties = {
  fontSize: 'var(--type-xs)',
  color: 'var(--danger)',
  marginTop: 'var(--space-2xs)',
};

const PULSE_STYLE = `
@keyframes mu-pulse-setup {
  from { opacity: 0.4; }
  to   { opacity: 1; }
}
@media (prefers-reduced-motion: no-preference) {
  .mu-pulse-setup {
    display: inline-block;
    animation: mu-pulse-setup 800ms var(--ease-emphasized) infinite alternate;
  }
}
@media (prefers-reduced-motion: reduce) {
  .mu-pulse-setup { display: none; }
}

/* Input focus styles */
.mu-setup-input:focus-visible {
  outline: none;
  border-color: var(--accent) !important;
  background: var(--surface-strong) !important;
  box-shadow: var(--focus-ring);
}
.mu-setup-input::placeholder {
  color: var(--text-muted);
}
`;

/* ─── Component ───────────────────────────────────────────────────────────── */

export function Form() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPasswordError(null);

    if (password.length < 12) {
      setPasswordError('Password must be at least 12 characters.');
      return;
    }

    setBusy(true);
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'unknown_error');
      return;
    }
    router.replace('/mockups');
  }

  return (
    <>
      <style>{PULSE_STYLE}</style>
      <form
        onSubmit={onSubmit}
        style={{ display: 'grid', gap: 'var(--space-md)', width: '100%' }}
        noValidate
      >
        {/* Global error alert */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              padding: 'var(--space-md)',
              background: 'var(--warning-soft)',
              borderLeft: '4px solid var(--warning)',
              borderRadius: 'var(--radius-sm)',
              lineHeight: 'var(--leading-snug)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--type-2xs)',
                fontWeight: 'var(--weight-bold)',
                letterSpacing: 'var(--tracking-wide)',
                textTransform: 'uppercase',
                color: 'var(--warning)',
                marginBottom: 4,
              }}
            >
              Error
            </div>
            <div style={{ fontSize: 'var(--type-sm)', color: 'var(--text)' }}>{error}</div>
          </div>
        )}

        {/* Name field */}
        <div style={labelStyle}>
          <span style={labelTextStyle}>Full name</span>
          <input
            required
            type="text"
            autoComplete="name"
            value={name}
            placeholder="Your name"
            className="mu-setup-input"
            onChange={(e) => setName(e.target.value)}
            style={inputStyle(false)}
          />
        </div>

        {/* Email field */}
        <div style={labelStyle}>
          <span style={labelTextStyle}>Email</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            placeholder="you@example.com"
            className="mu-setup-input"
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle(false)}
          />
        </div>

        {/* Password field */}
        <div style={labelStyle}>
          <span style={labelTextStyle}>Password</span>
          <input
            required
            type="password"
            autoComplete="new-password"
            minLength={12}
            value={password}
            placeholder="At least 12 characters"
            className="mu-setup-input"
            aria-invalid={passwordError ? 'true' : undefined}
            aria-describedby={passwordError ? 'setup-password-error' : 'setup-password-hint'}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(null);
            }}
            style={inputStyle(!!passwordError)}
          />
          {passwordError ? (
            <span id="setup-password-error" style={fieldErrorStyle} role="alert">
              {passwordError}
            </span>
          ) : (
            <span
              id="setup-password-hint"
              style={{
                fontSize: 'var(--type-xs)',
                color: 'var(--text-muted)',
                marginTop: 'var(--space-2xs)',
              }}
            >
              At least 12 characters
            </span>
          )}
        </div>

        {/* Submit */}
        <div style={{ marginTop: 'var(--space-xs)' }}>
          <button
            type="submit"
            disabled={busy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)',
              width: '100%',
              padding: '14px 24px',
              background: 'var(--btn-bg)',
              color: 'var(--accent)',
              border: 0,
              borderRadius: 'var(--radius-pill)',
              fontSize: 'var(--type-sm)',
              fontWeight: 'var(--weight-bold)',
              letterSpacing: '-0.005em',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.4 : 1,
              transition: [
                'background var(--motion-fast) var(--ease-standard)',
                'transform var(--motion-instant) var(--ease-standard)',
                'opacity var(--motion-fast) var(--ease-standard)',
              ].join(', '),
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!busy)
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--btn-bg-hover)';
            }}
            onMouseLeave={(e) => {
              if (!busy) (e.currentTarget as HTMLButtonElement).style.background = 'var(--btn-bg)';
            }}
            onMouseDown={(e) => {
              if (!busy) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--btn-bg-active)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(1px)';
              }
            }}
            onMouseUp={(e) => {
              if (!busy) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--btn-bg-hover)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'none';
              }
            }}
          >
            {busy ? (
              <>
                Creating account{' '}
                <span className="mu-pulse-setup" aria-hidden="true">
                  •
                </span>
              </>
            ) : (
              'Create admin account →'
            )}
          </button>
        </div>
      </form>
    </>
  );
}
