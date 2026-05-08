'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  mockupId: string;
  snapshot: HTMLCanvasElement;
  onClose: () => void;
  onSaved: () => void;
}

export function AnnotationModal({ mockupId, snapshot, onClose, onSaved }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Mount the snapshot canvas as the locked background.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ctx = snapshot.getContext('2d');
    if (!ctx) return;
    snapshot.style.maxWidth = '100%';
    snapshot.style.maxHeight = '70vh';
    snapshot.style.display = 'block';
    snapshot.style.background = '#fff';
    container.appendChild(snapshot);
    return () => {
      if (snapshot.parentNode === container) container.removeChild(snapshot);
    };
  }, [snapshot]);

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const blob: Blob = await new Promise((res, rej) => {
        snapshot.toBlob((b) => {
          if (b) res(b);
          else rej(new Error('toBlob failed'));
        }, 'image/png');
      });
      const fd = new FormData();
      fd.set('screenshot', blob, 'screenshot.png');
      // Phase 8 will integrate tldraw; for now send an empty drawing JSON.
      fd.set('tldraw', JSON.stringify({ schema: 'placeholder', records: [] }));
      fd.set('message', message);
      const res = await fetch(`/api/mockups/${mockupId}/annotations`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(`Failed: ${body.error ?? 'unknown'}`);
        return;
      }
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
          width: 'min(900px, 100%)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          display: 'grid',
          gap: 12,
        }}
      >
        <div ref={containerRef} style={{ display: 'grid', placeItems: 'center' }} />
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
