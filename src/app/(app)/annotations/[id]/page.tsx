import fs from 'node:fs';
import path from 'node:path';
import type { TLEditorSnapshot } from '@tldraw/tldraw';
import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ThreadTimeline } from '@/components/ThreadTimeline/ThreadTimeline';
import { Topbar } from '@/components/Topbar/Topbar';
import { INTENT_PILL_COLORS, isIntentType } from '@/lib/annotation/intent';
import { getAnnotation } from '@/lib/annotation/service';
import { pathForMockup } from '@/lib/mockup/url';
import { identify } from '@/lib/auth/identify';
import { resolveDisplayName, resolveDisplayNames } from '@/lib/auth/resolve-display-name';
import { isSetupCompleted } from '@/lib/auth/setup-state';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { rehydrateScreenshotBase64 } from '@/lib/tldraw/snapshot-screenshot';
import { ReadOnlyAnnotation } from './ReadOnlyAnnotation';

export default async function AnnotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isSetupCompleted())) redirect('/setup');
  const cs = await cookies();
  const hs = await headers();
  const fakeReq = {
    cookies: {
      get: (k: string) => {
        const c = cs.get(k);
        return c ? { value: c.value } : undefined;
      },
    },
    headers: { get: (k: string) => hs.get(k) },
  } as Parameters<typeof identify>[0];
  const id = await identify(fakeReq);
  if (!id) redirect('/login');

  const { id: annotationId } = await params;
  const annotation = await getAnnotation(annotationId);
  if (!annotation) {
    return <main style={{ padding: 24 }}>Annotation not found.</main>;
  }

  const messages = annotation.thread?.messages ?? [];
  const [authorInfo, mockup, authorNamesMap] = await Promise.all([
    resolveDisplayName(annotation.createdBy, annotation.createdByType),
    prisma.mockup.findUnique({ where: { id: annotation.mockupId }, select: { name: true } }),
    resolveDisplayNames(
      messages.map((m) => ({ createdBy: m.authorId, createdByType: m.authorType })),
    ),
  ]);

  const authorNamesById: Record<string, string> = {};
  for (const [authorId, dn] of authorNamesMap.entries()) {
    authorNamesById[authorId] = dn.name;
  }

  const mockupName = mockup?.name ?? annotation.mockupId;
  const viewerHref = (await pathForMockup(annotation.mockupId)) ?? '/projects';

  return (
    <>
      <Topbar
        breadcrumbs={[
          { label: mockupName, href: viewerHref },
          { label: 'Annotation', href: `/annotations/${annotation.id}` },
        ]}
      />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--space-xl)' }}>
        {/* Header */}
        <header style={{ marginBottom: 'var(--space-xl)' }}>
          <Link
            href={viewerHref}
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
            ← Back to {mockupName}
          </Link>

          {/* Baseline row: h2 "Annotation" + by author + pill + timestamp */}
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

            <span
              style={{
                fontSize: 'var(--type-sm)',
                color: 'var(--text-dim)',
              }}
            >
              by{' '}
              <strong style={{ color: 'var(--text)', fontWeight: 400 }}>{authorInfo.name}</strong>
            </span>

            {/* Author kind pill */}
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
                background: authorInfo.kind === 'user' ? 'var(--info-soft)' : 'var(--warning-soft)',
                color: authorInfo.kind === 'user' ? 'var(--info)' : 'var(--warning)',
              }}
            >
              {authorInfo.kind}
            </span>

            {/* Intent type pill */}
            {(() => {
              const intent = isIntentType(annotation.intentType) ? annotation.intentType : 'other';
              const c = INTENT_PILL_COLORS[intent];
              return (
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
                    background: c.bg,
                    color: c.fg,
                  }}
                >
                  {intent}
                </span>
              );
            })()}

            {/* Timestamp pushed to the right */}
            <time
              dateTime={annotation.createdAt.toISOString()}
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
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 400px',
            gap: 0,
          }}
          className="annotation-detail-grid"
        >
          {/* Left: canvas pane */}
          <div
            style={{
              padding: 'var(--space-2xl)',
              borderRight: '1px solid var(--border)',
            }}
          >
            {(() => {
              const tldrawAbs = path.join(env().DATA_DIR, annotation.tldrawPath);
              const screenshotAbs = path.join(env().DATA_DIR, annotation.screenshotPath);
              let tldraw: TLEditorSnapshot | null = null;
              try {
                const raw = JSON.parse(fs.readFileSync(tldrawAbs, 'utf8'));
                tldraw = rehydrateScreenshotBase64(
                  raw,
                  `/api/annotations/${annotation.id}/screenshot`,
                ) as TLEditorSnapshot;
              } catch {}
              const buf = fs.readFileSync(screenshotAbs);
              const width = buf.readUInt32BE(16);
              const height = buf.readUInt32BE(20);
              return (
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    background: 'var(--bg-card)',
                    aspectRatio: `${width} / ${height}`,
                    width: '100%',
                  }}
                >
                  <ReadOnlyAnnotation
                    annotationId={annotation.id}
                    screenshotUrl={`/api/annotations/${annotation.id}/screenshot`}
                    width={width}
                    height={height}
                    tldraw={tldraw}
                  />
                </div>
              );
            })()}
          </div>

          {/* Right: thread pane */}
          <div style={{ padding: 'var(--space-2xl)' }}>
            <ThreadTimeline
              annotationId={annotation.id}
              threadId={annotation.thread?.id ?? null}
              status={annotation.thread?.status ?? 'open'}
              messages={(annotation.thread?.messages ?? []).map((m) => ({
                id: m.id,
                authorType: m.authorType,
                authorId: m.authorId,
                body: m.body,
                createdAt: m.createdAt.toISOString(),
              }))}
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

export const dynamic = 'force-dynamic';
