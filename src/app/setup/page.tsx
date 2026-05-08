import { redirect } from 'next/navigation';
import { isSetupCompleted } from '@/lib/auth/setup-state';
import { Form } from './Form';

/* ─── Inline styles — no new deps, pure CSS vars from tokens.css ─────────── */

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'grid',
  gridTemplateColumns: '1fr',
  background: 'var(--bg)',
};

const leftPanelStyle: React.CSSProperties = {
  display: 'none' /* hidden below 900px, overridden by media query below */,
};

const wordmarkStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 56,
  fontWeight: 'var(--weight-extra)' as React.CSSProperties['fontWeight'],
  letterSpacing: 'var(--tracking-tighter)',
  lineHeight: 1,
  color: 'var(--text-bright)',
  display: 'inline-flex',
  alignItems: 'baseline',
};

const wordmarkDotStyle: React.CSSProperties = {
  color: 'var(--accent)',
  fontWeight: 'var(--weight-extra)' as React.CSSProperties['fontWeight'],
  fontSize: 64,
  lineHeight: 0.4,
  marginLeft: 2,
};

export default async function SetupPage() {
  if (await isSetupCompleted()) redirect('/login');

  return (
    <>
      <style>{`
        @media (min-width: 900px) {
          .mu-setup-grid {
            grid-template-columns: 1fr 480px !important;
          }
          .mu-setup-left {
            display: flex !important;
            flex-direction: column;
            justify-content: space-between;
            padding: 64px 56px;
            background:
              radial-gradient(ellipse 600px 400px at 30% 70%, oklch(28% 0.18 165 / 0.4), transparent 60%);
            border-right: 1px solid var(--border);
            position: relative;
            overflow: hidden;
          }
          .mu-setup-right {
            border-top: none !important;
          }
          .mu-setup-wordmark-mobile {
            display: none !important;
          }
        }
      `}</style>

      <main className="mu-setup-grid" style={pageStyle}>
        {/* Left panel — visible ≥ 900px */}
        <div className="mu-setup-left" style={leftPanelStyle}>
          {/* Top: wordmark + tagline */}
          <div>
            <div style={wordmarkStyle}>
              <span>Markup</span>
              <span style={wordmarkDotStyle} aria-hidden="true">
                .
              </span>
            </div>
            <p
              style={{
                marginTop: 'var(--space-lg)',
                fontSize: 'var(--type-md)',
                fontFamily: 'var(--font-display)',
                fontWeight: 'var(--weight-medium)',
                color: 'var(--text-dim)',
                lineHeight: 'var(--leading-snug)',
                maxWidth: 320,
                letterSpacing: '-0.005em',
              }}
            >
              First-run setup. This page only appears once — afterwards, sign-in replaces it.
            </p>
          </div>

          {/* Bottom: meta */}
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--type-2xs)',
              color: 'var(--text-muted)',
              letterSpacing: 'var(--tracking-wide)',
              textTransform: 'uppercase',
            }}
          >
            welcome
          </div>
        </div>

        {/* Right panel — form */}
        <div
          className="mu-setup-right"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '64px 56px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ width: '100%', maxWidth: 400, marginInline: 'auto' }}>
            {/* Mobile wordmark — hidden ≥ 900px */}
            <div
              className="mu-setup-wordmark-mobile"
              style={{ ...wordmarkStyle, marginBottom: 'var(--space-3xl)' }}
            >
              <span>Markup</span>
              <span style={wordmarkDotStyle} aria-hidden="true">
                .
              </span>
            </div>

            {/* Step indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 'var(--type-2xs)',
                letterSpacing: 'var(--tracking-wide)',
                textTransform: 'uppercase',
                color: 'var(--text-dim)',
                marginBottom: 'var(--space-md)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  background: 'var(--accent)',
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'inline-block',
                }}
                aria-hidden="true"
              />
              Step 1 of 1 · Create the admin account
            </div>

            {/* Heading */}
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--type-3xl)',
                fontWeight: 'var(--weight-bold)',
                letterSpacing: 'var(--tracking-tighter)',
                lineHeight: 'var(--leading-tight)',
                color: 'var(--text-bright)',
                marginBottom: 'var(--space-2xs)',
              }}
            >
              Welcome
            </h1>
            <p
              style={{
                fontSize: 'var(--type-md)',
                fontFamily: 'var(--font-body)',
                color: 'var(--text-dim)',
                lineHeight: 'var(--leading-snug)',
                marginBottom: 'var(--space-md)',
              }}
            >
              Create the administrator account to continue.
            </p>

            <Form />
          </div>
        </div>
      </main>
    </>
  );
}
