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
  const [mounted, setMounted] = useState(false);
  const [intentType, setIntentType] = useState<'visual' | 'copy' | 'behavior' | 'other'>('other');

  // Trigger enter animation on first render
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setBackgroundUrl(snapshot.toDataURL('image/png'));
  }, [snapshot]);

  async function save() {
    if (busy || !editorRef.current) return;
    setBusy(true);
    try {
      const editor = editorRef.current;
      const tldrawJson = editor.getSnapshot();
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
      fd.set('intent_type', intentType);
      if (bbox) {
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

  const isDisabled = busy || !message.trim();

  return (
    <>
      <style>{`
        @keyframes am-pulse {
          from { opacity: 0.5; }
          to   { opacity: 1; }
        }
        @keyframes am-dot-pulse {
          from { opacity: 0.3; transform: scale(0.85); }
          to   { opacity: 1;   transform: scale(1.15); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .am-canvas-pulse {
            animation: am-pulse 0.8s var(--ease-emphasized) infinite alternate;
          }
          .am-dot {
            display: inline-block;
            animation: am-dot-pulse 0.8s var(--ease-emphasized) infinite alternate;
            margin-left: 4px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .am-canvas-pulse { opacity: 1; }
          .am-dot { display: inline-block; margin-left: 4px; }
        }

        .am-textarea {
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          background: var(--surface-input);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-bright);
          font: inherit;
          font-size: var(--type-base);
          min-height: 80px;
          resize: vertical;
          box-sizing: border-box;
          transition: border-color var(--motion-fast) var(--ease-standard);
          font-family: inherit;
        }
        .am-textarea:focus-visible {
          outline: none;
          border-color: var(--accent);
          box-shadow: var(--focus-ring);
        }
        .am-textarea::placeholder { color: var(--text-muted); }

        .am-btn {
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
          transition: background var(--motion-fast) var(--ease-standard), transform var(--motion-instant) var(--ease-standard), opacity var(--motion-fast) var(--ease-standard);
          white-space: nowrap;
          letter-spacing: -0.005em;
          font-family: inherit;
        }
        .am-btn:hover:not(:disabled) { background: var(--btn-bg-hover); }
        .am-btn:active:not(:disabled) { background: var(--btn-bg-active); transform: translateY(1px); }
        .am-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .am-btn-ghost {
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
        .am-btn-ghost:hover { background: var(--surface-hover); border-color: var(--border-strong); color: var(--text-bright); }
        .am-btn-ghost:active:not(:disabled) { background: var(--surface-active); transform: translateY(1px); }
        .am-btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          padding: 'var(--space-2xl)',
          background: 'oklch(0% 0 0 / 0.65)',
          display: 'grid',
          placeItems: 'center',
          opacity: mounted ? 1 : 0,
          transition: mounted
            ? `opacity var(--motion-base) var(--ease-emphasized)`
            : `opacity var(--motion-fast) var(--ease-exit)`,
        }}
      >
        {/* Modal — stopPropagation so clicks inside don't close */}
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          style={{
            width: 'min(920px, 100%)',
            background:
              'linear-gradient(135.92deg, oklch(20% 0.025 322 / 0.95) 7%, oklch(15% 0.02 322 / 0.95) 98%)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-popover)',
            padding: 'var(--space-xl)',
            display: 'grid',
            gap: 'var(--space-md)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
            transition: mounted
              ? `opacity var(--motion-base) var(--ease-emphasized), transform var(--motion-base) var(--ease-emphasized)`
              : `opacity var(--motion-fast) var(--ease-exit), transform var(--motion-fast) var(--ease-exit)`,
          }}
        >
          {/* Canvas / placeholder */}
          {backgroundUrl ? (
            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                height: 360,
              }}
            >
              <AnnotationCanvas
                backgroundUrl={backgroundUrl}
                width={snapshot.width}
                height={snapshot.height}
                onEditorMount={(ed) => {
                  editorRef.current = ed;
                }}
              />
            </div>
          ) : (
            <div
              style={{
                height: 360,
                display: 'grid',
                placeItems: 'center',
                color: 'var(--text-dim)',
                fontSize: 'var(--type-sm)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span>
                <span className="am-canvas-pulse">Preparing canvas…</span>
                <span className="am-dot">•</span>
              </span>
            </div>
          )}

          <div
            role="radiogroup"
            aria-label="intent type"
            style={{
              display: 'flex',
              gap: 'var(--space-xs)',
              flexWrap: 'wrap',
            }}
          >
            {(['visual', 'copy', 'behavior', 'other'] as const).map((kind) => {
              const active = intentType === kind;
              return (
                // biome-ignore lint/a11y/useSemanticElements: chip selector — custom styled, native <input type=radio> doesn't allow this treatment
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setIntentType(kind)}
                  data-testid={`intent-chip-${kind}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--border-strong)',
                    background: active ? 'var(--accent)' : 'transparent',
                    color: active ? 'oklch(15% 0.005 165)' : 'var(--text)',
                    fontWeight: active ? 700 : 500,
                    fontSize: 'var(--type-sm)',
                    cursor: 'pointer',
                    transition: 'all var(--motion-fast) var(--ease-standard)',
                  }}
                >
                  {kind}
                </button>
              );
            })}
          </div>

          <textarea
            className="am-textarea"
            placeholder="What's wrong / what to change?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
            <button type="button" onClick={onClose} disabled={busy} className="am-btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={isDisabled}
              data-testid="annotation-save"
              className="am-btn"
            >
              {busy ? 'Saving…' : 'Save annotation →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
