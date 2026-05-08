'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface VersionRow {
  id: string;
  createdAt: string;
  authorName: string;
  authorKind: 'user' | 'agent';
}

interface Props {
  mockupId: string;
  currentVersionId: string;
  versions: VersionRow[];
}

export function Versions({ mockupId, currentVersionId, versions }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function promote(vid: string) {
    if (busyId) return;
    setBusyId(vid);
    try {
      const r = await fetch(`/api/mockups/${mockupId}/versions/${vid}/promote`, {
        method: 'PATCH',
      });
      if (!r.ok) alert('promote failed');
      else router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(vid: string) {
    if (busyId) return;
    if (!confirm('Delete this version? This cannot be undone.')) return;
    setBusyId(vid);
    try {
      const r = await fetch(`/api/mockups/${mockupId}/versions/${vid}`, { method: 'DELETE' });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        alert(`Delete failed: ${body.error ?? r.status}`);
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <style>{`
        .versions-toggle-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: none;
          border: 0;
          cursor: pointer;
          padding: var(--space-md) var(--space-lg);
          text-align: left;
          font-family: inherit;
          transition: background var(--motion-fast) var(--ease-standard), transform var(--motion-instant) var(--ease-standard);
          border-radius: var(--radius-xs);
        }
        .versions-toggle-header:hover { background: var(--surface-input); }
        .versions-toggle-header:active { background: var(--surface-active); transform: translateY(1px); }
        .versions-toggle-left {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        .versions-eyebrow {
          font-size: var(--type-2xs);
          font-weight: 700;
          letter-spacing: var(--tracking-wider);
          text-transform: uppercase;
          color: var(--text-dim);
        }
        .versions-count {
          font-feature-settings: 'tnum';
          font-size: var(--type-2xs);
          color: var(--text-muted);
        }
        .versions-chevron {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-right: 1.5px solid var(--text-dim);
          border-bottom: 1.5px solid var(--text-dim);
          transform: rotate(45deg);
          transition: transform var(--motion-base) var(--ease-standard);
          flex-shrink: 0;
        }
        .versions-chevron.open {
          transform: rotate(225deg);
        }
        @media (prefers-reduced-motion: reduce) {
          .versions-chevron { transition: none; }
        }

        .versions-panel {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows var(--motion-fast) var(--ease-exit);
        }
        .versions-panel.open {
          grid-template-rows: 1fr;
          transition: grid-template-rows var(--motion-base) var(--ease-standard);
        }
        .versions-panel-inner {
          overflow: hidden;
        }
        @media (prefers-reduced-motion: reduce) {
          .versions-panel,
          .versions-panel.open {
            transition: none;
          }
        }

        .version-row {
          padding: var(--space-sm);
          background: var(--surface-soft);
          border-radius: var(--radius-sm);
          display: grid;
          gap: 6px;
          margin: 0 var(--space-lg) var(--space-sm);
        }
        .version-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: var(--type-xs);
          color: var(--text-dim);
        }
        .version-time {
          font-feature-settings: 'tnum';
        }
        .version-current-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
          font-size: var(--type-2xs);
          font-weight: 700;
          letter-spacing: var(--tracking-wide);
          text-transform: uppercase;
          background: var(--success-soft);
          color: var(--success);
        }
        .version-author {
          font-size: var(--type-xs);
          color: var(--text);
        }
        .version-author-by {
          color: var(--text-dim);
        }
        .version-actions {
          display: flex;
          gap: 6px;
        }
        .btn-mini {
          padding: 5px 10px;
          font-size: var(--type-2xs);
          border-radius: var(--radius-pill);
          background: transparent;
          border: 1px solid var(--border-strong);
          color: var(--text);
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background var(--motion-fast) var(--ease-standard), color var(--motion-fast) var(--ease-standard), transform var(--motion-instant) var(--ease-standard);
        }
        .btn-mini:hover { background: var(--surface-hover); color: var(--text-bright); }
        .btn-mini:active { background: var(--surface-active); transform: scale(0.97); }
        .btn-mini.danger { color: var(--danger); border-color: oklch(40% 0.1 25); }
        .btn-mini.danger:hover { background: var(--danger-soft); }
        .btn-mini.danger:active { background: oklch(32% 0.1 25); transform: scale(0.97); }
        .btn-mini:disabled { opacity: 0.4; cursor: not-allowed; }
        .version-diff-link {
          font-size: var(--type-xs);
          color: var(--text-dim);
          text-decoration: none;
          display: block;
          text-align: center;
          transition: color var(--motion-fast) var(--ease-standard), transform var(--motion-instant) var(--ease-standard);
          border-radius: var(--radius-xs);
        }
        .version-diff-link:hover { color: var(--accent); }
        .version-diff-link:active { color: var(--accent-bright); transform: translateY(1px); }
      `}</style>

      <div data-testid="versions-tab" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {/* Toggle header */}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="versions-toggle-header"
        >
          <span className="versions-toggle-left">
            <span className="versions-eyebrow">Versions</span>
            <span className="versions-count">{versions.length}</span>
          </span>
          <span className={`versions-chevron${open ? ' open' : ''}`} aria-hidden="true" />
        </button>

        {/* Animated panel */}
        <div className={`versions-panel${open ? ' open' : ''}`}>
          <div className="versions-panel-inner">
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--space-sm)' }}>
              {versions.map((v) => {
                const isCurrent = v.id === currentVersionId;
                const isDisabled = isCurrent || busyId !== null;
                return (
                  <li key={v.id}>
                    <div className="version-row">
                      {/* Meta row: timestamp + CURRENT pill */}
                      <div className="version-meta-row">
                        <span className="version-time">
                          {new Date(v.createdAt).toLocaleString()}
                        </span>
                        {isCurrent && <span className="version-current-pill">Current</span>}
                      </div>

                      {/* Author row */}
                      <div className="version-author">
                        <span className="version-author-by">by </span>
                        {v.authorName}
                      </div>

                      {/* Action buttons */}
                      <div className="version-actions">
                        <button
                          type="button"
                          disabled={isDisabled}
                          onClick={() => promote(v.id)}
                          data-testid={`promote-${v.id}`}
                          className="btn-mini"
                        >
                          Make current
                        </button>
                        <button
                          type="button"
                          disabled={isDisabled}
                          onClick={() => remove(v.id)}
                          data-testid={`delete-${v.id}`}
                          className="btn-mini danger"
                        >
                          Delete
                        </button>
                      </div>

                      {/* Diff link */}
                      {!isCurrent && (
                        <Link
                          href={`/mockups/${mockupId}/diff?from=${v.id}&to=${currentVersionId}`}
                          data-testid={`diff-${v.id}`}
                          className="version-diff-link"
                        >
                          Diff vs. current
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
