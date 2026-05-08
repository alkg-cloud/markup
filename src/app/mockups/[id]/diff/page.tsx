import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { identify } from '@/lib/auth/identify';
import { isSetupCompleted } from '@/lib/auth/setup-state';
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
  if (!(await identify(fakeReq))) redirect('/login');

  const { id: mockupId } = await params;
  const { from, to } = await searchParams;
  const resolved = await resolveDiffParams(mockupId, from ?? null, to ?? null);
  if (resolved.kind === 'not_found') notFound();
  if (resolved.kind === 'invalid') {
    return (
      <main style={{ padding: 24 }}>
        Invalid version IDs. Choose two versions from the mockup viewer&apos;s Versions tab.
      </main>
    );
  }
  return (
    <DiffViewer
      mockupId={mockupId}
      fromVid={resolved.from.id}
      toVid={resolved.to.id}
      fromCreatedAt={resolved.from.createdAt.toISOString()}
      toCreatedAt={resolved.to.createdAt.toISOString()}
    />
  );
}
