'use client';

import Link from 'next/link';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DiffViewer } from './DiffViewer';

type DiffPayload =
  | {
      kind: 'ok';
      viewerHref: string;
      from: { id: string; createdAt: string };
      to: { id: string; createdAt: string };
    }
  | { kind: 'invalid'; viewerHref: string };

export default function DiffPage() {
  const { id: mockupId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const [payload, setPayload] = useState<DiffPayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'not_found' | 'error'>('loading');

  useEffect(() => {
    if (!mockupId) return;
    let cancelled = false;
    const url = new URL(
      `/api/mockups/${encodeURIComponent(mockupId)}/diff-versions`,
      window.location.origin,
    );
    if (from) url.searchParams.set('from', from);
    if (to) url.searchParams.set('to', to);
    fetch(url.toString(), { credentials: 'include' })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          window.location.replace('/login');
          return;
        }
        if (res.status === 404) {
          setStatus('not_found');
          return;
        }
        if (!res.ok) {
          setStatus('error');
          return;
        }
        const json: DiffPayload = await res.json();
        if (cancelled) return;
        setPayload(json);
        setStatus('ok');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [mockupId, from, to]);

  if (status === 'not_found') notFound();
  if (status === 'error') {
    return <main style={{ padding: 24, color: 'var(--danger)' }}>Failed to load diff.</main>;
  }
  if (status === 'loading' || !payload) {
    return null;
  }

  if (payload.kind === 'invalid') {
    return (
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 'var(--space-md)',
          padding: 'var(--space-xl)',
          textAlign: 'center',
          background: 'var(--bg)',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--type-2xl)',
            fontWeight: 700,
            color: 'var(--text-bright)',
            letterSpacing: 'var(--tracking-tight)',
          }}
        >
          Choose two versions
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--type-md)',
            color: 'var(--text-dim)',
            maxWidth: 400,
            lineHeight: 'var(--leading-normal)',
          }}
        >
          Open the Versions tab in the mockup viewer and select a &quot;from&quot; and
          &quot;to&quot; version to compare.
        </p>
        <Link
          href={payload.viewerHref}
          style={{
            marginTop: 'var(--space-xs)',
            fontSize: 'var(--type-sm)',
            color: 'var(--text-dim)',
            textDecoration: 'none',
          }}
        >
          ← Back to mockup
        </Link>
      </main>
    );
  }

  return (
    <DiffViewer
      mockupId={mockupId}
      viewerHref={payload.viewerHref}
      fromVid={payload.from.id}
      toVid={payload.to.id}
      fromCreatedAt={payload.from.createdAt}
      toCreatedAt={payload.to.createdAt}
    />
  );
}
