import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { identify } from '@/lib/auth/identify';
import { isSetupCompleted } from '@/lib/auth/setup-state';
import { pathForMockup } from '@/lib/mockup/url';
import { DiffViewer } from './DiffViewer';
import { resolveDiffParams } from './resolve';

export default async function DiffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
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
  const session = await identify(fakeReq);
  if (!session) redirect('/login');

  const { id: mockupId } = await params;
  const { from, to } = await searchParams;
  const resolved = await resolveDiffParams(mockupId, from ?? null, to ?? null);
  if (resolved.kind === 'not_found') notFound();
  // Back-to-mockup link uses the canonical path-based URL.
  const viewerHref = (await pathForMockup(mockupId)) ?? '/projects';
  if (resolved.kind === 'invalid') {
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
          href={viewerHref}
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
      viewerHref={viewerHref}
      fromVid={resolved.from.id}
      toVid={resolved.to.id}
      fromCreatedAt={resolved.from.createdAt.toISOString()}
      toCreatedAt={resolved.to.createdAt.toISOString()}
    />
  );
}

export const dynamic = 'force-dynamic';
