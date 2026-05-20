'use client';

/**
 * Public signup landing for invite tokens.
 *
 * Route: `/invite/[token]` — lives OUTSIDE `src/app/(app)/`, so the auth shell
 * (Topbar, IdentityContext, useRequireAuth) does not run. This page must work
 * for unauthenticated visitors; that is the whole point. It is its own client
 * component and talks to the API directly with `fetch`.
 *
 * Visual treatment ports `docs/design/design-system/23-invite-signup.html`
 * (the canonical DS mockup). Inline styles + one tiny `<style>` block for
 * pseudo-class state (focus / hover) — same pattern used by `src/app/setup/`.
 *
 * UX-spec: `docs/superpowers/specs/2026-05-20-invites-design.md` §6.
 * Plan: `docs/superpowers/plans/2026-05-20-invites-implementation.md` Task 4.2.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/* ─── State shapes mirroring /api/invites/[token]/state ──────────────────── */

interface UsableState {
  usable: true;
  boundEmail: boolean;
}

interface UnusableState {
  usable: false;
  reason: 'expired' | 'used' | 'revoked' | 'disabled' | 'unknown';
}

type InviteState = UsableState | UnusableState;

const TERMINAL_COPY: Record<UnusableState['reason'], { title: string; body: string }> = {
  expired: {
    title: 'This invite expired.',
    body: "It's no longer usable. Ask your admin for a new link.",
  },
  used: {
    title: 'This invite was already used.',
    body: 'Each invite can only create one account. Ask your admin for a new link.',
  },
  revoked: {
    title: 'This invite was revoked.',
    body: "It's no longer usable. Ask your admin for a new link.",
  },
  disabled: {
    title: 'This invite was disabled.',
    body: 'It received too many failed attempts and was disabled for safety. Ask your admin for a new link.',
  },
  unknown: {
    title: "This invite isn't available.",
    body: 'Ask your admin for a new link.',
  },
};

/* ─── Local CSS — pseudo-class state only (focus / hover) ────────────────── */

const LOCAL_STYLE = `
.mu-invite-input:focus-visible {
  outline: none;
  border-color: var(--accent-bright);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.mu-invite-input::placeholder {
  color: var(--text-muted);
}
.mu-invite-submit:hover:not(:disabled) {
  background: var(--accent-bright);
}
.mu-invite-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
`;

/* ─── Inline-style atoms ─────────────────────────────────────────────────── */

const frameStyle: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'grid',
  placeItems: 'center',
  padding: 32,
  background: 'var(--bg)',
};

const stripedFrameStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: 32,
  background:
    'repeating-linear-gradient(135deg, oklch(12% 0.025 165) 0 18px, oklch(11% 0.02 165) 18px 36px)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
};

const wordmarkStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontWeight: 800,
  fontSize: 28,
  letterSpacing: '-0.025em',
  color: 'var(--text-bright)',
  marginBottom: 20,
  display: 'inline-flex',
  alignItems: 'baseline',
};

const wordmarkDotStyle: React.CSSProperties = {
  color: 'var(--accent)',
  fontSize: 32,
  lineHeight: 0.4,
  marginLeft: 1,
};

const cardStyle: React.CSSProperties = {
  width: 380,
  maxWidth: 'calc(100% - 32px)',
  padding: 28,
  background: 'var(--bg-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-card)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  boxShadow: 'var(--shadow-sm)',
};

const h1Style: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--text-bright)',
  lineHeight: 1.2,
};

const preambleStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-dim)',
  lineHeight: 1.5,
};

const fieldStyle: React.CSSProperties = {
  display: 'block',
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-dim)',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 12px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
  color: 'var(--text-bright)',
  outline: 'none',
  transition: 'border-color var(--motion-fast), box-shadow var(--motion-fast)',
  fontFamily: 'var(--font-body)',
  boxSizing: 'border-box',
};

const fieldHintStyle: React.CSSProperties = {
  display: 'block',
  marginTop: 6,
  fontSize: 11,
  lineHeight: 1.4,
  color: 'var(--text-muted)',
};

const errorStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--radius-xs)',
  background: 'var(--danger-soft)',
  color: 'var(--danger)',
  fontSize: 12,
  lineHeight: 1.4,
};

const submitStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  background: 'var(--accent)',
  color: 'var(--bg)',
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.02em',
  borderRadius: 'var(--radius-sm)',
  border: 0,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  transition: 'background var(--motion-fast)',
};

const footStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-muted)',
  marginTop: 20,
  letterSpacing: '0.01em',
};

const warningCardStyle: React.CSSProperties = {
  ...cardStyle,
  alignItems: 'center',
  textAlign: 'center',
  gap: 12,
};

const warningIconStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 'var(--radius-sm)',
  background: 'var(--danger-soft)',
  color: 'var(--danger)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 4,
};

const warningTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--text-bright)',
};

const warningBodyStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-dim)',
  lineHeight: 1.5,
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function InviteSignupPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [state, setState] = useState<InviteState | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Bootstrap: resolve token, check auth, fetch invite state.
  useEffect(() => {
    let alive = true;
    (async () => {
      const resolved = await params;
      if (!alive) return;
      setToken(resolved.token);

      // Signed-in users skip the invite landing entirely.
      const me = await fetch('/api/auth/me');
      if (!alive) return;
      if (me.ok) {
        // No global toast bus in this project; redirect silently per plan note.
        router.replace('/');
        return;
      }

      const stateRes = await fetch(`/api/invites/${resolved.token}/state`);
      if (!alive) return;
      if (!stateRes.ok) {
        setState({ usable: false, reason: 'unknown' });
        return;
      }
      const json: InviteState = await stateRes.json();
      if (!alive) return;
      setState(json);
    })();
    return () => {
      alive = false;
    };
  }, [params, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !state?.usable) return;

    setBusy(true);
    setError(null);

    const res = await fetch(`/api/invites/${token}/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    setBusy(false);

    if (res.status === 201) {
      router.replace('/');
      return;
    }
    if (res.status === 429) {
      setError('Too many attempts. Try again later.');
      return;
    }

    const body = (await res.json().catch(() => ({}))) as { error?: string };

    if (body.error === 'email_mismatch') {
      setError("Email doesn't match this invite. Use the email your admin invited.");
      return;
    }
    if (body.error === 'invalid_body') {
      // Server didn't tell us which field; pick the most likely.
      if (password.length < 12) {
        setError('Password must be at least 12 characters.');
      } else {
        setError('Please enter a valid email.');
      }
      return;
    }
    if (body.error === 'invite_unusable') {
      // Race: invite went terminal between /state and POST. Refetch state to
      // swap the UI to the warning-card template.
      const stateRes = await fetch(`/api/invites/${token}/state`);
      if (stateRes.ok) {
        const json: InviteState = await stateRes.json();
        setState(json);
      } else {
        setState({ usable: false, reason: 'unknown' });
      }
      return;
    }

    setError('Something went wrong. Please try again.');
  }

  // Pre-bootstrap (haven't fetched /state yet): render nothing to avoid flash.
  if (!state) return null;

  /* ─── Terminal states share one warning-card template ─────────────────── */
  if (!state.usable) {
    const copy = TERMINAL_COPY[state.reason];
    return (
      <>
        <style>{LOCAL_STYLE}</style>
        <main style={frameStyle}>
          <div style={stripedFrameStyle}>
            <div style={wordmarkStyle}>
              <span>Markup</span>
              <span style={wordmarkDotStyle} aria-hidden="true">
                .
              </span>
            </div>

            <div style={warningCardStyle} role="alert">
              <div style={warningIconStyle} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" role="img">
                  <title>Warning</title>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M7.56 1h.88l6.54 12.26-.44.74H1.44L1 13.26 7.56 1zM8 2.28L2.28 13H13.7L8 2.28zM8.625 12v-1h-1.25v1h1.25zm-1.25-2V6h1.25v4h-1.25z"
                  />
                </svg>
              </div>
              <div style={warningTitleStyle}>{copy.title}</div>
              <div style={warningBodyStyle}>{copy.body}</div>
            </div>

            <div style={footStyle}>Trouble signing up? Ask the admin who sent you this link.</div>
          </div>
        </main>
      </>
    );
  }

  /* ─── Usable: render the form ─────────────────────────────────────────── */
  return (
    <>
      <style>{LOCAL_STYLE}</style>
      <main style={frameStyle}>
        <div style={stripedFrameStyle}>
          <div style={wordmarkStyle}>
            <span>Markup</span>
            <span style={wordmarkDotStyle} aria-hidden="true">
              .
            </span>
          </div>

          <form onSubmit={onSubmit} style={cardStyle} noValidate>
            <h1 style={h1Style}>Create your account</h1>
            <p style={preambleStyle}>You were invited to Markup.</p>

            <div style={fieldStyle}>
              <label style={fieldLabelStyle} htmlFor="invite-email">
                Email
              </label>
              <input
                id="invite-email"
                className="mu-invite-input"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
              {state.boundEmail && (
                <span style={fieldHintStyle}>Use the email your admin used to invite you.</span>
              )}
            </div>

            <div style={fieldStyle}>
              <label style={fieldLabelStyle} htmlFor="invite-password">
                Password
              </label>
              <input
                id="invite-password"
                className="mu-invite-input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
                style={inputStyle}
              />
              <span style={fieldHintStyle}>At least 12 characters.</span>
            </div>

            <div style={fieldStyle}>
              <label style={fieldLabelStyle} htmlFor="invite-name">
                Name
              </label>
              <input
                id="invite-name"
                className="mu-invite-input"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {error && (
              <div role="alert" style={errorStyle}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !email || !password || !name}
              className="mu-invite-submit"
              style={submitStyle}
            >
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </form>

          <div style={footStyle}>Trouble signing up? Ask the admin who sent you this link.</div>
        </div>
      </main>
    </>
  );
}
