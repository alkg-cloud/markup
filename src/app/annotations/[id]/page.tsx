import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ThreadTimeline } from '@/components/ThreadTimeline/ThreadTimeline';
import { getAnnotation } from '@/lib/annotation/service';
import { identify } from '@/lib/auth/identify';
import { isSetupCompleted } from '@/lib/auth/setup-state';

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

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <Link href={`/mockups/${annotation.mockupId}`} style={{ color: 'var(--text-secondary)' }}>
          ← Back to mockup
        </Link>
        <span style={{ color: 'var(--text-tertiary)' }}>
          Created {new Date(annotation.createdAt).toLocaleString()}
        </span>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            padding: 12,
          }}
        >
          <img
            src={`/api/annotations/${annotation.id}/screenshot`}
            alt="annotation screenshot"
            style={{ width: '100%', display: 'block', borderRadius: 'var(--radius-sm)' }}
          />
        </div>
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
        />
      </div>
    </main>
  );
}
