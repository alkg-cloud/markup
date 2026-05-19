'use client';

import type { TLEditorSnapshot } from '@tldraw/tldraw';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThreadTimeline } from '@/components/ThreadTimeline/ThreadTimeline';
import { Topbar } from '@/components/Topbar/Topbar';
import { INTENT_PILL_COLORS, type IntentType } from '@/lib/annotation/intent';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { ReadOnlyAnnotation } from './ReadOnlyAnnotation';

interface DetailPayload {
  annotation: {
    id: string;
    createdAt: string;
    createdBy: string;
    createdByType: 'user' | 'agent';
    intentType: IntentType;
  };
  author: { name: string; kind: 'user' | 'agent' };
  thread: {
    id: string | null;
    status: 'open' | 'resolved' | string;
    messages: {
      id: string;
      authorType: 'user' | 'agent';
      authorId: string;
      body: string;
      createdAt: string;
    }[];
  };
  authorNamesById: Record<string, string>;
  mockup: { name: string; viewerHref: string };
  screenshot: { url: string; width: number; height: number };
  tldraw: TLEditorSnapshot | null;
}

export default function AnnotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { identity, loading: authLoading } = useRequireAuth();
  const [data, setData] = useState<DetailPayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'not_found' | 'error'>('loading');

  useEffect(() => {
    if (!id || authLoading || !identity) return;
    let cancelled = false;
    fetch(`/api/annotations/${encodeURIComponent(id)}/detail`, {
      credentials: 'include',
    })
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
        const json: DetailPayload = await res.json();
        if (cancelled) return;
        setData(json);
        setStatus('ok');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [id, authLoading, identity]);

  if (status === 'not_found') {
    return <main style={{ padding: 24 }}>Annotation not found.</main>;
  }
  if (status === 'error') {
    return <main style={{ padding: 24, color: 'var(--danger)' }}>Failed to load annotation.</main>;
  }
  if (status === 'loading' || !data) {
    return null;
  }

  const { annotation, author, thread, authorNamesById, mockup, screenshot, tldraw } = data;
  const intentColors = INTENT_PILL_COLORS[annotation.intentType];

  return (
    <>
      <Topbar
        breadcrumbs={[
          { label: mockup.name, href: mockup.viewerHref },
          { label: 'Annotation', href: `/annotations/${annotation.id}` },
        ]}
      />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--space-xl)' }}>
        {/* Header */}
        <header style={{ marginBottom: 'var(--space-xl)' }}>
          <Link
            href={mockup.viewerHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2xs)',
              color: 'var(--text-dim)',
              fontSize: 'var(--type-sm)',
              textDecoration: 'none',
              marginBottom: 'var(--space-sm)',
              transition: 'color var(--motion-fast) var(--ease-standard)',
            }}
            className="back-link-annotation"
          >
            ← Back to {mockup.name}
          </Link>

          {/* Baseline row: h2 + by author + pill + timestamp */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'var(--space-sm)',
              flexWrap: 'wrap',
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
                lineHeight: 'var(--leading-tight)',
              }}
            >
              Annotation
            </h2>

            <span style={{ fontSize: 'var(--type-sm)', color: 'var(--text-dim)' }}>
              by <strong style={{ color: 'var(--text)', fontWeight: 400 }}>{author.name}</strong>
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 'var(--type-2xs)',
                fontWeight: 700,
                letterSpacing: 'var(--tracking-wide)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                textTransform: 'uppercase',
                background: author.kind === 'user' ? 'var(--info-soft)' : 'var(--warning-soft)',
                color: author.kind === 'user' ? 'var(--info)' : 'var(--warning)',
              }}
            >
              {author.kind}
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 'var(--type-2xs)',
                fontWeight: 700,
                letterSpacing: 'var(--tracking-wide)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                textTransform: 'uppercase',
                background: intentColors.bg,
                color: intentColors.fg,
              }}
            >
              {annotation.intentType}
            </span>

            <time
              dateTime={annotation.createdAt}
              className="tnum"
              style={{
                marginLeft: 'auto',
                fontSize: 'var(--type-sm)',
                color: 'var(--text-dim)',
              }}
            >
              {new Date(annotation.createdAt).toLocaleString()}
            </time>
          </div>
        </header>

        {/* Two-column body */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 0 }}
          className="annotation-detail-grid"
        >
          {/* Left: canvas pane */}
          <div
            style={{
              padding: 'var(--space-2xl)',
              borderRight: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: 'var(--bg-card)',
                aspectRatio:
                  screenshot.width && screenshot.height
                    ? `${screenshot.width} / ${screenshot.height}`
                    : 'auto',
                width: '100%',
              }}
            >
              <ReadOnlyAnnotation
                annotationId={annotation.id}
                screenshotUrl={screenshot.url}
                width={screenshot.width}
                height={screenshot.height}
                tldraw={tldraw}
              />
            </div>
          </div>

          {/* Right: thread pane */}
          <div style={{ padding: 'var(--space-2xl)' }}>
            <ThreadTimeline
              annotationId={annotation.id}
              threadId={thread.id}
              status={thread.status as 'open' | 'resolved'}
              messages={thread.messages}
              authorNamesById={authorNamesById}
            />
          </div>
        </div>

        <style>{`
          .back-link-annotation {
            transition: color var(--motion-fast) var(--ease-standard), transform var(--motion-instant) var(--ease-standard);
          }
          .back-link-annotation:hover {
            color: var(--text-bright);
          }
          .back-link-annotation:active {
            color: var(--text-bright);
            transform: translateY(1px);
          }
          @media (max-width: 1023px) {
            .annotation-detail-grid {
              grid-template-columns: 1fr !important;
            }
            .annotation-detail-grid > div:first-child {
              border-right: none !important;
              border-bottom: 1px solid var(--border);
            }
          }
        `}</style>
      </main>
    </>
  );
}
