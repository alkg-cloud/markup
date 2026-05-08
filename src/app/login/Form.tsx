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
    background: hasError ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.03)',
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

/* ─── Pulse animation injected once ──────────────────────────────────────── */
const PULSE_STYLE = `
@keyframes mu-pulse {
  from { opacity: 0.4; }
  to   { opacity: 1; }
}
@media (prefers-reduced-motion: no-preference) {
  .mu-pulse {
    display: inline-block;
    animation: mu-pulse 800ms var(--ease-emphasized) infinite alternate;
  }
}
@media (prefers-reduced-motion: reduce) {
  .mu-pulse { display: none; }
}

/* Input focus styles */
.mu-field-input:focus-visible {
  outline: none;
  border-color: var(--accent) !important;
  background: rgba(255, 255, 255, 0.06) !important;
  box-shadow: var(--focus-ring);
}
.mu-field-input::placeholder {
  color: var(--text-muted);
}
`;

/* ─── Component ───────────────────────────────────────────────────────────── */

export function Form() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setBusy(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
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
        {/* Global error alert — above h1 equivalent; here above fields */}
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

        {/* Email field */}
        <div style={labelStyle}>
          <span style={labelTextStyle}>Email</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            placeholder="you@example.com"
            aria-invalid={emailError ? 'true' : undefined}
            aria-describedby={emailError ? 'login-email-error' : undefined}
            className="mu-field-input"
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(null);
            }}
            style={inputStyle(!!emailError)}
          />
          {emailError && (
            <span id="login-email-error" style={fieldErrorStyle} role="alert">
              {emailError}
            </span>
          )}
        </div>

        {/* Password field */}
        <div style={labelStyle}>
          <span style={labelTextStyle}>Password</span>
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            placeholder="••••••••••••"
            className="mu-field-input"
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle(false)}
          />
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
                Sign in{' '}
                <span className="mu-pulse" aria-hidden="true">
                  •
                </span>
              </>
            ) : (
              'Sign in →'
            )}
          </button>
        </div>
      </form>
    </>
  );
}
