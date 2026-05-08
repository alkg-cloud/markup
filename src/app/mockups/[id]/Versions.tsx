'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface VersionRow {
  id: string;
  createdAt: string;
  createdBy: string;
  createdByType: string;
}

interface Props {
  mockupId: string;
  currentVersionId: string;
  versions: VersionRow[];
}

export function Versions({ mockupId, currentVersionId, versions }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

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
    <details data-testid="versions-tab" style={{ borderTop: '1px solid var(--border-primary)' }}>
      <summary
        style={{ padding: 12, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}
      >
        Versions ({versions.length})
      </summary>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {versions.map((v) => {
          const isCurrent = v.id === currentVersionId;
          return (
            <li
              key={v.id}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--border-primary)',
                display: 'grid',
                gap: 4,
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {new Date(v.createdAt).toLocaleString()}
                </span>
                {isCurrent && (
                  <span style={{ color: 'var(--success)', textTransform: 'uppercase' }}>
                    current
                  </span>
                )}
              </div>
              <div style={{ color: 'var(--text-tertiary)' }}>
                by {v.createdByType}: {v.createdBy.slice(0, 8)}…
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  disabled={isCurrent || busyId !== null}
                  onClick={() => promote(v.id)}
                  data-testid={`promote-${v.id}`}
                  style={{ flex: 1, padding: '4px 8px', fontSize: 11 }}
                >
                  Make current
                </button>
                <button
                  type="button"
                  disabled={isCurrent || busyId !== null}
                  onClick={() => remove(v.id)}
                  data-testid={`delete-${v.id}`}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: 11,
                    color: isCurrent ? 'var(--text-tertiary)' : 'var(--danger, #ef4444)',
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
