import fs from 'node:fs';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { identify } from '@/lib/auth/identify';
import { isSetupCompleted } from '@/lib/auth/setup-state';
import { env } from '@/lib/env';
import { thumbnailPath } from '@/lib/mockup/storage';
import { prisma } from '@/lib/prisma';
import { MockupViewer } from './MockupViewer';

export default async function MockupViewerPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { id: mockupId } = await params;
  const mockup = await prisma.mockup.findUnique({
    where: { id: mockupId },
    include: {
      versions: { orderBy: { createdAt: 'desc' } },
      annotations: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { thread: { include: { _count: { select: { messages: true } } } } },
      },
    },
  });
  if (!mockup?.currentVersionId) {
    return <main style={{ padding: 24 }}>Mockup not found.</main>;
  }
  const hasThumbnail = fs.existsSync(thumbnailPath(env().DATA_DIR, mockup.id));

  return (
    <MockupViewer
      mockupId={mockup.id}
      mockupName={mockup.name}
      currentVersionId={mockup.currentVersionId}
      hasThumbnail={hasThumbnail}
      versions={mockup.versions.map((v) => ({
        id: v.id,
        createdAt: v.createdAt.toISOString(),
        createdBy: v.createdBy,
        createdByType: v.createdByType,
      }))}
      annotations={mockup.annotations.map((a) => ({
        id: a.id,
        createdAt: a.createdAt.toISOString(),
        screenshotPath: a.screenshotPath,
        threadStatus: a.thread?.status ?? 'open',
        messageCount: a.thread?._count.messages ?? 0,
      }))}
    />
  );
}
