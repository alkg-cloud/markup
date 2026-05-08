'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnnotationModal } from '@/components/AnnotationModal/AnnotationModal';
import { type VersionRow, Versions } from './Versions';

interface AnnotationSummary {
  id: string;
  createdAt: string;
  screenshotPath: string;
  threadStatus: string;
  messageCount: number;
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
  const [busy, setBusy] = useState(false);

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
        const canvas = await html2canvas(doc.body, { useCORS: true, backgroundColor: null });
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
      if (!iframe?.contentDocument) return;
      const canvas = await html2canvas(iframe.contentDocument.body, {
        useCORS: true,
        backgroundColor: null,
      });
      setSnapshot(canvas);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/mockups" style={{ color: 'var(--text-secondary)' }}>
            ← Mockups
          </Link>
          <strong>{mockupName}</strong>
        </div>
        <button
          type="button"
          onClick={captureScreenshot}
          disabled={busy}
          data-testid="comment-button"
          style={{
            padding: '6px 12px',
            background: 'var(--accent)',
            color: '#fff',
            border: 0,
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          {busy ? 'Capturing…' : 'Comment'}
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: 0 }}>
        <aside
          style={{
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-primary)',
            overflowY: 'auto',
          }}
        >
          <h2 style={{ padding: 16, margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
            Annotations ({annotations.length})
          </h2>
          {annotations.length === 0 ? (
            <p style={{ padding: '0 16px', color: 'var(--text-tertiary)', fontSize: 13 }}>
              No annotations yet. Click Comment to capture and annotate the current state.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {annotations.map((a) => (
                <li
                  key={a.id}
                  style={{ padding: 12, borderBottom: '1px solid var(--border-primary)' }}
                >
                  <Link
                    href={`/annotations/${a.id}`}
                    style={{ color: 'inherit', display: 'block' }}
                    data-testid="annotation-card"
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          textTransform: 'uppercase',
                          color:
                            a.threadStatus === 'resolved'
                              ? 'var(--success)'
                              : 'var(--text-secondary)',
                        }}
                      >
                        {a.threadStatus}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      {a.messageCount} {a.messageCount === 1 ? 'message' : 'messages'}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Versions mockupId={mockupId} currentVersionId={currentVersionId} versions={versions} />
        </aside>

        <main style={{ position: 'relative', background: '#000' }}>
          <iframe
            ref={iframeRef}
            title={mockupName}
            src={`/_mockups/${mockupId}/index.html?v=${currentVersionId}`}
            sandbox="allow-scripts allow-same-origin"
            style={{ width: '100%', height: '100%', border: 0, background: '#fff' }}
          />
        </main>
      </div>

      {snapshot && (
        <AnnotationModal
          mockupId={mockupId}
          snapshot={snapshot}
          onClose={() => setSnapshot(null)}
          onSaved={(_a) => {
            setSnapshot(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
