'use client';
import type { Editor, TLEditorSnapshot } from '@tldraw/tldraw';
import { useRef, useState } from 'react';
import { AnnotationCanvas } from '@/components/AnnotationCanvas/AnnotationCanvas';

interface Props {
  annotationId: string;
  screenshotUrl: string;
  width: number;
  height: number;
  tldraw: TLEditorSnapshot | null;
}

export function ReadOnlyAnnotation({ annotationId, screenshotUrl, width, height, tldraw }: Props) {
  const editorRef = useRef<Editor | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    const editor = editorRef.current;
    if (!editor) return;
    setSaving(true);
    setError(null);
    try {
      const snap = editor.getSnapshot();
      const res = await fetch(`/api/annotations/${annotationId}/tldraw`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snap),
      });
      if (!res.ok) throw new Error(`save_failed_${res.status}`);
      setSavedAt(Date.now());
      setEditing(false);
      editor.updateInstanceState({ isReadonly: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown_error');
    } finally {
      setSaving(false);
    }
  };

  const enterEdit = () => {
    setEditing(true);
    setSavedAt(null);
    setError(null);
    editorRef.current?.updateInstanceState({ isReadonly: false });
  };

  if (!tldraw) {
    return (
      <div
        style={{
          position: 'relative',
          aspectRatio: width && height ? `${width} / ${height}` : 'auto',
          width: '100%',
        }}
      >
        <img
          src={screenshotUrl}
          alt="annotation screenshot"
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '6px 12px',
            background: 'var(--scrim-mid)',
            color: 'var(--text-muted)',
            fontSize: 'var(--type-xs)',
            letterSpacing: 'var(--tracking-wide)',
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="2" y1="2" x2="22" y2="22" />
            <path d="M10.5 3.5 L3 11l-1 4 4-1 7.5-7.5" />
            <path d="M14 4l2 2" />
          </svg>
          No drawing — view-only screenshot
        </div>
      </div>
    );
  }
  return (
    <div
      data-testid="annotation-readonly-canvas"
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <AnnotationCanvas
        backgroundUrl={screenshotUrl}
        width={width}
        height={height}
        snapshot={tldraw}
        editable={editing}
        onEditorMount={(ed) => {
          editorRef.current = ed;
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          zIndex: 50,
          pointerEvents: 'auto',
        }}
      >
        {savedAt && !editing && (
          <span style={{ fontSize: 'var(--type-xs)', color: 'var(--success)' }}>Saved</span>
        )}
        {error && (
          <span style={{ fontSize: 'var(--type-xs)', color: 'var(--danger)' }}>
            Save failed: {error}
          </span>
        )}
        {editing ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            data-testid="annotation-save"
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
              color: 'var(--text-on-accent)',
              fontWeight: 700,
              fontSize: 'var(--type-sm)',
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.6 : 1,
              boxShadow: 'var(--shadow-popover)',
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        ) : (
          <button
            type="button"
            onClick={enterEdit}
            data-testid="annotation-edit"
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-edit-button)',
              color: 'var(--text-bright)',
              fontWeight: 600,
              fontSize: 'var(--type-sm)',
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
            }}
          >
            Edit drawings
          </button>
        )}
      </div>
    </div>
  );
}
