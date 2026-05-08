'use client';
import type { Editor } from '@tldraw/tldraw';
import { useEffect, useRef, useState } from 'react';
import { AnnotationCanvas } from '@/components/AnnotationCanvas/AnnotationCanvas';

interface Props {
  mockupId: string;
  snapshot: HTMLCanvasElement;
  onClose: () => void;
  onSaved: (annotation: { id: string }) => void;
}

export function AnnotationModal({ mockupId, snapshot, onClose, onSaved }: Props) {
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
      const tldrawJson = editorRef.current.getSnapshot();
      const blob: Blob = await new Promise((res, rej) => {
        snapshot.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png');
      });
      const fd = new FormData();
      fd.set('screenshot', blob, 'screenshot.png');
      fd.set('tldraw', JSON.stringify(tldrawJson));
      fd.set('message', message);
      const res = await fetch(`/api/mockups/${mockupId}/annotations`, { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(`Failed: ${body.error ?? 'unknown'}`);
        return;
      }
      const body = await res.json();
      onSaved({ id: body.id });
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
