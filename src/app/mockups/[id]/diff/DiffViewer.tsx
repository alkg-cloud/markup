'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface Props {
  mockupId: string;
  /** Canonical viewer URL for the back-link — computed server-side
   *  because the path includes the project slug + folder ancestors
   *  which require a DB walk. */
  viewerHref: string;
  fromVid: string;
  toVid: string;
  fromCreatedAt: string;
  toCreatedAt: string;
}

export function DiffViewer({
  mockupId,
  viewerHref,
  fromVid,
  toVid,
  fromCreatedAt,
  toCreatedAt,
}: Props) {
  const leftRef = useRef<HTMLIFrameElement>(null);
  const rightRef = useRef<HTMLIFrameElement>(null);
  const [overlay, setOverlay] = useState(false);
  const [scrollSync, setScrollSync] = useState(true);
  const suppressRef = useRef(false);

  // Set up scroll sync between iframes (best-effort, same-origin only).
  useEffect(() => {
    const wireScroll = (src: HTMLIFrameElement | null, dst: HTMLIFrameElement | null) => {
      if (!src || !dst) return () => {};
      const onLoad = () => {
        const sw = src.contentWindow;
        if (!sw) return;
        const onScroll = () => {
          if (!scrollSync || suppressRef.current) return;
          const dw = dst.contentWindow;
          if (!dw) return;
          suppressRef.current = true;
          dw.scrollTo({ left: sw.scrollX, top: sw.scrollY, behavior: 'instant' });
          requestAnimationFrame(() => {
            suppressRef.current = false;
          });
        };
        sw.addEventListener('scroll', onScroll, { passive: true });
      };
      src.addEventListener('load', onLoad);
      return () => src.removeEventListener('load', onLoad);
    };
    const u1 = wireScroll(leftRef.current, rightRef.current);
    const u2 = wireScroll(rightRef.current, leftRef.current);
    return () => {
      u1();
      u2();
    };
  }, [scrollSync]);

  const fromDate = new Date(fromCreatedAt).toLocaleString();
  const toDate = new Date(toCreatedAt).toLocaleString();

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'var(--topbar-height) 1fr', height: '100vh' }}>
      {/* Header bar */}
      <header
        style={{
          height: 'var(--topbar-height)',
          padding: '0 var(--space-xl)',
          background: 'var(--bg-elevated-mid)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-md)',
        }}
      >
        {/* Left: back link */}
        <Link
          href={viewerHref}
          style={{
            color: 'var(--text-dim)',
            fontSize: 'var(--type-sm)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            transition: 'color var(--motion-fast) var(--ease-standard)',
            whiteSpace: 'nowrap',
          }}
          className="diff-back-link"
        >
          ← Back to mockup
        </Link>

        {/* Center: eyebrow + timestamps in mono */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--type-xs)',
            color: 'var(--text-dim)',
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"tnum"',
            letterSpacing: '0.02em',
            flex: 1,
            justifyContent: 'center',
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--type-2xs)',
              letterSpacing: 'var(--tracking-wider)',
              textTransform: 'uppercase',
              color: 'var(--text-bright)',
              fontWeight: 700,
            }}
          >
            Diff
          </span>
          <span>{fromDate}</span>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>→</span>
          <span>{toDate}</span>
        </div>

        {/* Right: toggle pills */}
        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexShrink: 0 }}>
          <label
            className="diff-toggle-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              fontSize: 'var(--type-xs)',
              fontWeight: 600,
              background: overlay ? 'var(--accent-soft)' : 'var(--surface-hover)',
              color: overlay ? 'var(--accent)' : 'var(--text-dim)',
              border: '1px solid transparent',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={overlay}
              onChange={(e) => setOverlay(e.target.checked)}
              style={{
                position: 'absolute',
                opacity: 0,
                width: 0,
                height: 0,
                pointerEvents: 'none',
              }}
            />
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'currentColor',
                opacity: overlay ? 1 : 0.4,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            Overlay
          </label>

          <label
            className="diff-toggle-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              fontSize: 'var(--type-xs)',
              fontWeight: 600,
              background: scrollSync ? 'var(--accent-soft)' : 'var(--surface-hover)',
              color: scrollSync ? 'var(--accent)' : 'var(--text-dim)',
              border: '1px solid transparent',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={scrollSync}
              onChange={(e) => setScrollSync(e.target.checked)}
              style={{
                position: 'absolute',
                opacity: 0,
                width: 0,
                height: 0,
                pointerEvents: 'none',
              }}
            />
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'currentColor',
                opacity: scrollSync ? 1 : 0.4,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            Scroll sync
          </label>
        </div>
      </header>

      {/* Iframes wrapper — hairline divider via gap + background */}
      <div
        style={{
          position: 'relative',
          display: overlay ? 'block' : 'grid',
          gridTemplateColumns: overlay ? undefined : '1fr 1fr',
          gap: overlay ? undefined : '1px',
          background: overlay ? undefined : 'var(--border)',
          minHeight: 0,
        }}
      >
        {/* FROM iframe wrapper */}
        <div
          style={{
            display: overlay ? undefined : 'grid',
            gridTemplateRows: overlay ? undefined : '32px 1fr',
            background: 'var(--bg-iframe-light)',
            position: overlay ? 'absolute' : 'static',
            inset: overlay ? 0 : undefined,
          }}
        >
          {!overlay && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-elevated-strong)',
                color: 'var(--text-bright)',
                padding: '8px var(--space-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--type-2xs)',
                letterSpacing: 'var(--tracking-wide)',
                textTransform: 'uppercase',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ color: 'var(--accent)' }}>FROM</span>
              <span>· {fromDate}</span>
            </div>
          )}
          <iframe
            ref={leftRef}
            title="from"
            src={`/m/${mockupId}/index.html?v=${fromVid}`}
            sandbox="allow-scripts allow-same-origin"
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              background: 'var(--bg-iframe-white)',
              display: 'block',
            }}
          />
        </div>

        {/* TO iframe wrapper */}
        <div
          style={{
            display: overlay ? undefined : 'grid',
            gridTemplateRows: overlay ? undefined : '32px 1fr',
            background: 'var(--bg-iframe-light)',
            position: overlay ? 'absolute' : 'static',
            inset: overlay ? 0 : undefined,
            opacity: overlay ? 0.5 : 1,
          }}
        >
          {!overlay && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-elevated-strong)',
                color: 'var(--text-bright)',
                padding: '8px var(--space-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--type-2xs)',
                letterSpacing: 'var(--tracking-wide)',
                textTransform: 'uppercase',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ color: 'var(--accent)' }}>TO</span>
              <span>· {toDate}</span>
            </div>
          )}
          <iframe
            ref={rightRef}
            title="to"
            src={`/m/${mockupId}/index.html?v=${toVid}`}
            sandbox="allow-scripts allow-same-origin"
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              background: 'var(--bg-iframe-white)',
              display: 'block',
            }}
          />
        </div>
      </div>

      <style>{`
        .diff-back-link {
          border-radius: var(--radius-xs);
          transition: color var(--motion-fast) var(--ease-standard), transform var(--motion-instant) var(--ease-standard);
        }
        .diff-back-link:hover { color: var(--text-bright); }
        .diff-back-link:active { color: var(--text-bright); transform: translateY(1px); }

        .diff-toggle-pill {
          border-radius: var(--radius-pill);
          transition: background var(--motion-fast) var(--ease-standard), color var(--motion-fast) var(--ease-standard), transform var(--motion-instant) var(--ease-standard);
        }
        .diff-toggle-pill:hover { filter: brightness(1.1); }
        .diff-toggle-pill:active { transform: scale(0.97); }
        .diff-toggle-pill:focus-visible {
          outline: none;
          box-shadow: var(--focus-ring);
        }
      `}</style>
    </div>
  );
}
