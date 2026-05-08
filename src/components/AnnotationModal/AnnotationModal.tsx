'use client';
import type { Editor } from '@tldraw/tldraw';
import { useEffect, useRef, useState } from 'react';
import { AnnotationCanvas } from '@/components/AnnotationCanvas/AnnotationCanvas';

interface Props {
  mockupId: string;
  snapshot: HTMLCanvasElement;
  captureCtx: { scrollX: number; scrollY: number; viewportWidth: number; viewportHeight: number };
  onClose: () => void;
  onSaved: () => void;
}

export function AnnotationModal({ mockupId, snapshot, captureCtx, onClose, onSaved }: Props) {
  const editorRef = useRef<Editor | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBackgroundUrl(snapshot.toDataURL('image/png'));
  }, [snapshot]);

  async function save() {
    if (busy || !editorRef.current) return;
    setBusy(true);
    try {
      const editor = editorRef.current;
      const tldrawJson = editor.getSnapshot();
      // Compute drawing bbox excluding the locked screenshot image shape
      const shapes = editor.getCurrentPageShapesSorted().filter((s) => s.type !== 'image');
      let bbox: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
      for (const s of shapes) {
        const b = editor.getShapePageBounds(s.id);
        if (!b) continue;
        bbox = bbox
          ? {
              minX: Math.min(bbox.minX, b.minX),
              minY: Math.min(bbox.minY, b.minY),
              maxX: Math.max(bbox.maxX, b.maxX),
              maxY: Math.max(bbox.maxY, b.maxY),
            }
          : { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY };
      }

      const fd = new FormData();
      const blob: Blob = await new Promise((res, rej) =>
        snapshot.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'),
      );
      fd.set('screenshot', blob, 'screenshot.png');
      fd.set('tldraw', JSON.stringify(tldrawJson));
      fd.set('message', message);
      if (bbox) {
        // bbox is in tldraw page coords; the locked image shape is at (0,0) sized to the snapshot,
        // so tldraw page coords align 1:1 with snapshot pixel coords. Convert to iframe coords by adding capture scroll.
        const pinCoords = {
          scrollX: captureCtx.scrollX,
          scrollY: captureCtx.scrollY,
          viewportWidth: captureCtx.viewportWidth,
          viewportHeight: captureCtx.viewportHeight,
          bboxX: captureCtx.scrollX + bbox.minX,
          bboxY: captureCtx.scrollY + bbox.minY,
          bboxW: bbox.maxX - bbox.minX,
          bboxH: bbox.maxY - bbox.minY,
        };
        fd.set('pinCoords', JSON.stringify(pinCoords));
      }
      const res = await fetch(`/api/mockups/${mockupId}/annotations`, { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(`Failed: ${body.error ?? 'unknown'}`);
        return;
      }
      await res.json();
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        style={{
          width: 'min(1100px, 100%)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          display: 'grid',
          gap: 12,
        }}
      >
        {backgroundUrl ? (
          <AnnotationCanvas
            backgroundUrl={backgroundUrl}
            width={snapshot.width}
            height={snapshot.height}
            onEditorMount={(ed) => {
              editorRef.current = ed;
            }}
          />
        ) : (
          <div
            style={{
              height: '70vh',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            Preparing canvas…
          </div>
        )}
        <textarea
          placeholder="What's wrong / what to change?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: 8,
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-sm)',
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || !message.trim()}
            data-testid="annotation-save"
            style={{
              padding: '8px 16px',
              background: 'var(--accent)',
              color: '#fff',
              border: 0,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              opacity: busy || !message.trim() ? 0.5 : 1,
            }}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
