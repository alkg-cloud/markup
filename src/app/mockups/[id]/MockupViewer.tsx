'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnnotationModal } from '@/components/AnnotationModal/AnnotationModal';
import { AnnotationPin } from '@/components/AnnotationPin/AnnotationPin';
import { computePinScreenPosition, parsePinCoords } from '@/lib/annotation/pin-coords';
import { sanitizeOklchInDocument } from '@/lib/oklch-sanitize';
import { type VersionRow, Versions } from './Versions';

interface AnnotationSummary {
  id: string;
  createdAt: string;
  screenshotPath: string;
  threadStatus: string;
  messageCount: number;
  pinCoords: string | null;
}

interface Props {
  mockupId: string;
  mockupName: string;
  currentVersionId: string;
  hasThumbnail: boolean;
  versions: VersionRow[];
  annotations: AnnotationSummary[];
}

export function MockupViewer({
  mockupId,
  mockupName,
  currentVersionId,
  hasThumbnail,
  versions,
  annotations,
}: Props) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [snapshot, setSnapshot] = useState<HTMLCanvasElement | null>(null);
  const [captureCtx, setCaptureCtx] = useState<{
    scrollX: number;
    scrollY: number;
    viewportWidth: number;
    viewportHeight: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [iframeScroll, setIframeScroll] = useState({ scrollX: 0, scrollY: 0 });

  // current version index for the topbar pill label
  const currentVersionIndex = versions.findIndex((v) => v.id === currentVersionId);
  const versionLabel =
    currentVersionIndex !== -1 ? `v${versions.length - currentVersionIndex} · current` : 'current';

  // Track iframe scroll to keep pin overlays aligned
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      const win = iframe.contentWindow;
      if (!win) return;
      const onScroll = () => setIframeScroll({ scrollX: win.scrollX, scrollY: win.scrollY });
      onScroll();
      win.addEventListener('scroll', onScroll, { passive: true });
      (iframe as unknown as { _onScroll?: () => void })._onScroll = onScroll;
    };
    iframe.addEventListener('load', onLoad);
    return () => {
      const win = iframe.contentWindow;
      const stored = (iframe as unknown as { _onScroll?: () => void })._onScroll;
      if (win && stored) win.removeEventListener('scroll', stored);
      iframe.removeEventListener('load', onLoad);
    };
  }, [currentVersionId]);

  // Lazy thumbnail capture
  useEffect(() => {
    if (hasThumbnail) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = async () => {
      await new Promise((r) => setTimeout(r, 800));
      try {
        const html2canvas = (await import('html2canvas')).default;
        const doc = iframe.contentDocument;
        if (!doc) return;
        const canvas = await html2canvas(doc.body, {
          useCORS: true,
          backgroundColor: null,
          onclone: (_doc: Document) => sanitizeOklchInDocument(_doc),
        });
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const fd = new FormData();
          fd.set('thumbnail', blob, 'thumbnail.png');
          await fetch(`/api/mockups/${mockupId}/thumbnail`, { method: 'POST', body: fd });
        }, 'image/png');
      } catch {
        // best-effort; ignore failures
      }
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [mockupId, hasThumbnail]);

  async function captureScreenshot() {
    setBusy(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const iframe = iframeRef.current;
      if (!iframe?.contentDocument || !iframe.contentWindow) return;
      const win = iframe.contentWindow;
      setCaptureCtx({
        scrollX: win.scrollX,
        scrollY: win.scrollY,
        viewportWidth: win.innerWidth,
        viewportHeight: win.innerHeight,
      });
      const canvas = await html2canvas(iframe.contentDocument.body, {
        useCORS: true,
        backgroundColor: null,
        onclone: (_doc: Document) => sanitizeOklchInDocument(_doc),
      });
      setSnapshot(canvas);
    } finally {
      setBusy(false);
    }
  }

  /* ── Status pill ── */
  function StatusPill({ status }: { status: string }) {
    const isResolved = status === 'resolved';
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 10px',
          borderRadius: 'var(--radius-pill)',
          fontSize: 'var(--type-2xs)',
          fontWeight: 700,
          letterSpacing: 'var(--tracking-wide)',
          textTransform: 'uppercase' as const,
          background: isResolved ? 'var(--success-soft)' : 'var(--info-soft)',
          color: isResolved ? 'var(--success)' : 'var(--info)',
        }}
      >
        {status}
      </span>
    );
  }

  return (
    <>
      <style>{`
        .mv-back-link {
          color: var(--text-dim);
          text-decoration: none;
          font-size: var(--type-sm);
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: color var(--motion-fast) var(--ease-standard);
        }
        .mv-back-link:hover { color: var(--text-bright); }

        .mv-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          background: var(--btn-bg);
          color: var(--accent);
          font-weight: 700;
          font-size: var(--type-xs);
          border: 0;
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: background var(--motion-fast) var(--ease-standard), transform var(--motion-instant) var(--ease-standard);
          white-space: nowrap;
          letter-spacing: -0.005em;
          font-family: inherit;
        }
        .mv-btn:hover { background: var(--btn-bg-hover); }
        .mv-btn:active { background: var(--btn-bg-active); transform: translateY(1px); }
        .mv-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .mv-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          background: transparent;
          color: var(--text);
          font-weight: 700;
          font-size: var(--type-xs);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: background var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard), color var(--motion-fast) var(--ease-standard);
          white-space: nowrap;
          letter-spacing: -0.005em;
          font-family: inherit;
        }
        .mv-btn-ghost:hover {
          background: var(--surface-hover);
          border-color: var(--border-strong);
          color: var(--text-bright);
        }
        .mv-btn-ghost:active {
          background: var(--surface-active);
          transform: translateY(1px);
        }

        .mv-annotation-row {
          display: grid;
          gap: 4px;
          padding: var(--space-sm) var(--space-lg);
          border-left: 2px solid transparent;
          cursor: pointer;
          transition: background var(--motion-fast) var(--ease-standard), border-color var(--motion-instant) var(--ease-standard);
          text-decoration: none;
          color: inherit;
        }
        .mv-annotation-row:hover { background: var(--surface-input); }
        .mv-annotation-row:active { border-left-color: var(--accent); background: var(--surface-active); }

        .mv-version-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
          font-size: var(--type-2xs);
          font-weight: 700;
          letter-spacing: var(--tracking-wide);
          text-transform: uppercase;
          background: var(--accent-soft);
          color: var(--accent);
        }
      `}</style>

      <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', minHeight: '100vh' }}>
        {/* ── Topbar ── */}
        <header
          style={{
            height: 'var(--topbar-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 var(--space-xl)',
            background: 'var(--bg-elevated-mid)',
            borderBottom: '1px solid var(--border)',
            backdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          {/* Left group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <Link href="/mockups" className="mv-back-link">
              ← Mockups
            </Link>

            {/* Vertical divider */}
            <span
              aria-hidden="true"
              style={{
                display: 'block',
                width: 1,
                height: 22,
                background: 'var(--border)',
                flexShrink: 0,
              }}
            />

            {/* Title row: name + version pill */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-xs)' }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--type-md)',
                  fontWeight: 700,
                  color: 'var(--text-bright)',
                  letterSpacing: 'var(--tracking-tight)',
                }}
              >
                {mockupName}
              </span>
              <span className="mv-version-pill">{versionLabel}</span>
            </div>
          </div>

          {/* Right group */}
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            <button
              type="button"
              className="mv-btn-ghost"
              onClick={() => {
                document
                  .querySelector('[data-testid="versions-tab"]')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Versions
            </button>
            <button
              type="button"
              className="mv-btn"
              onClick={captureScreenshot}
              disabled={busy}
              data-testid="comment-button"
            >
              {busy ? 'Capturing…' : '+ Comment'}
            </button>
          </div>
        </header>

        {/* ── Body: sidebar + main ── */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'var(--sidebar-width) 1fr', minHeight: 0 }}
        >
          {/* ── Sidebar ── */}
          <aside
            style={{
              width: 'var(--sidebar-width)',
              background: 'var(--bg-elevated-soft)',
              borderRight: '1px solid var(--border)',
              overflowY: 'auto',
            }}
          >
            {/* Annotations eyebrow */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-md) var(--space-lg) var(--space-xs)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--type-2xs)',
                  fontWeight: 700,
                  letterSpacing: 'var(--tracking-wider)',
                  textTransform: 'uppercase',
                  color: 'var(--text-dim)',
                }}
              >
                Annotations
              </span>
              <span
                style={{
                  fontFeatureSettings: "'tnum'",
                  fontSize: 'var(--type-2xs)',
                  color: 'var(--text-muted)',
                }}
              >
                {annotations.length}
              </span>
            </div>

            {annotations.length === 0 ? (
              <p
                style={{
                  padding: '0 var(--space-lg)',
                  color: 'var(--text-dim)',
                  fontSize: 'var(--type-sm)',
                  lineHeight: 'var(--leading-normal)',
                  margin: 0,
                }}
              >
                No annotations yet — click + Comment to capture and annotate.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {annotations.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/annotations/${a.id}`}
                      data-testid="annotation-card"
                      className="mv-annotation-row"
                    >
                      {/* Meta row: timestamp + status pill */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 'var(--type-2xs)',
                            color: 'var(--text-muted)',
                            fontFeatureSettings: "'tnum'",
                            letterSpacing: '0.02em',
                          }}
                        >
                          {new Date(a.createdAt).toLocaleString()}
                        </span>
                        <StatusPill status={a.threadStatus} />
                      </div>
                      {/* Message preview */}
                      <span
                        style={{
                          fontSize: 'var(--type-sm)',
                          color: 'var(--text)',
                          lineHeight: 'var(--leading-snug)',
                        }}
                      >
                        {a.messageCount} {a.messageCount === 1 ? 'message' : 'messages'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* Versions section */}
            <Versions mockupId={mockupId} currentVersionId={currentVersionId} versions={versions} />
          </aside>

          {/* ── Main: iframe + pin overlay ── */}
          <main
            style={{
              position: 'relative',
              background: 'var(--bg-iframe)',
            }}
          >
            <iframe
              ref={iframeRef}
              title={mockupName}
              src={`/m/${mockupId}/index.html?v=${currentVersionId}`}
              sandbox="allow-scripts allow-same-origin"
              style={{
                width: '100%',
                height: '100%',
                border: 0,
                background: 'var(--bg-iframe-white)',
              }}
            />
            {/* Pin overlay */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {annotations.map((a, i) => {
                const pin = parsePinCoords(a.pinCoords);
                if (!pin) return null;
                const pos = computePinScreenPosition(pin, iframeScroll);
                if (!pos.visible) return null;
                return (
                  <div key={a.id} className="pin-wrapper" style={{ pointerEvents: 'auto' }}>
                    <AnnotationPin
                      index={i + 1}
                      annotationId={a.id}
                      x={pos.x}
                      y={pos.y}
                      status={a.threadStatus}
                    />
                  </div>
                );
              })}
            </div>
          </main>
        </div>

        {snapshot && captureCtx && (
          <AnnotationModal
            mockupId={mockupId}
            snapshot={snapshot}
            captureCtx={captureCtx}
            onClose={() => {
              setSnapshot(null);
              setCaptureCtx(null);
            }}
            onSaved={() => {
              setSnapshot(null);
              setCaptureCtx(null);
              router.refresh();
            }}
          />
        )}
      </div>
    </>
  );
}
