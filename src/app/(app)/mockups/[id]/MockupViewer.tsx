'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnnotationModal } from '@/components/AnnotationModal/AnnotationModal';
import { AppMain } from '@/components/AppMain/AppMain';
import { MockupToolbar } from '@/components/MockupToolbar/MockupToolbar';
import { sanitizeOklchInDocument } from '@/lib/oklch-sanitize';
import { MockupAnnotationsPanel } from './components/MockupAnnotationsPanel';
import { MockupCanvas } from './components/MockupCanvas';
import { MockupDiffModal } from './components/MockupDiffModal';
import styles from './components/MockupViewer.module.css';
import { MockupViewerHeader } from './components/MockupViewerHeader';
import type { VersionRow } from './Versions';

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
  const iframeWrapRef = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = useState<HTMLCanvasElement | null>(null);
  const [captureCtx, setCaptureCtx] = useState<{
    scrollX: number;
    scrollY: number;
    viewportWidth: number;
    viewportHeight: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [iframeScroll, setIframeScroll] = useState({ scrollX: 0, scrollY: 0 });
  const [toolbarMode, setToolbarMode] = useState<'edit' | 'comment'>('edit');
  const [toolbarZoom, setToolbarZoom] = useState(100);

  // History panel (Versions) visibility — controlled from toolbar
  const [historyOpen, setHistoryOpen] = useState(false);

  // Diff modal state
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffText, setDiffText] = useState<string | null>(null);

  // Current version index for the topbar pill label
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
          backgroundColor: '#ffffff',
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

  // ── Toolbar handlers ──

  function onFullscreen() {
    if (iframeWrapRef.current?.requestFullscreen) {
      iframeWrapRef.current.requestFullscreen().catch(() => {
        // User denied or browser unsupported — ignore silently
      });
    }
  }

  function onHistory() {
    setHistoryOpen((o) => !o);
  }

  async function onDiff() {
    setDiffOpen(true);
    setDiffText(null);
    if (versions.length < 2) {
      setDiffText('Nothing to compare yet.');
      return;
    }
    // versions[0] is newest (current), versions[1] is the previous
    const current = versions[currentVersionIndex];
    const previous = versions[currentVersionIndex + 1];
    if (!current || !previous) {
      setDiffText('Nothing to compare yet.');
      return;
    }
    try {
      const res = await fetch(
        `/api/mockups/${mockupId}/diff?from=${previous.id}&to=${current.id}&format=unified`,
      );
      const text = await res.text();
      setDiffText(text);
    } catch {
      setDiffText('Failed to load diff.');
    }
  }

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
        backgroundColor: '#ffffff',
        onclone: (_doc: Document) => sanitizeOklchInDocument(_doc),
      });
      setSnapshot(canvas);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppMain variant="viewer" ariaLabel="Mockup viewer">
        <MockupViewerHeader
          mockupName={mockupName}
          versionLabel={versionLabel}
          busy={busy}
          onVersionsScroll={() => {
            document
              .querySelector('[data-testid="versions-tab"]')
              ?.scrollIntoView({ behavior: 'smooth' });
          }}
          onCapture={captureScreenshot}
        />

        <MockupToolbar
          zoom={toolbarZoom}
          versionLabel={versionLabel}
          mode={toolbarMode}
          onModeChange={setToolbarMode}
          onZoomChange={(delta) => {
            setToolbarZoom((z) => {
              if (delta === 'reset') return 100;
              return Math.min(400, Math.max(25, z + delta));
            });
          }}
          onFullscreen={onFullscreen}
          onHistory={onHistory}
          onDiff={onDiff}
        />

        <div className={styles.body}>
          <MockupAnnotationsPanel
            annotations={annotations}
            mockupId={mockupId}
            currentVersionId={currentVersionId}
            versions={versions}
            historyOpen={historyOpen}
            onHistoryOpenChange={setHistoryOpen}
          />
          <MockupCanvas
            mockupId={mockupId}
            mockupName={mockupName}
            currentVersionId={currentVersionId}
            toolbarZoom={toolbarZoom}
            iframeScroll={iframeScroll}
            annotations={annotations}
            iframeRef={iframeRef}
            iframeWrapRef={iframeWrapRef}
          />
        </div>
      </AppMain>

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

      {diffOpen && (
        <MockupDiffModal
          diffText={diffText}
          onClose={() => {
            setDiffOpen(false);
            setDiffText(null);
          }}
        />
      )}
    </>
  );
}
