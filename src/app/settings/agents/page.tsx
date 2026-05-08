import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppNav } from '@/components/AppNav/AppNav';
import { identify } from '@/lib/auth/identify';
import { isSetupCompleted } from '@/lib/auth/setup-state';
import { prisma } from '@/lib/prisma';
import { AgentsClient } from './AgentsClient';

export default async function AgentsPage() {
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
  if (!id || id.kind !== 'user') redirect('/login');
  const tokens = await prisma.agentToken.findMany({
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: 'desc' },
  });
  const initial = tokens.map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: t.createdAt.toISOString(),
    lastUsedAt: t.lastUsedAt ? t.lastUsedAt.toISOString() : null,
  }));
  return (
    <>
      {/* Top navigation strip — mirrors /mockups so the user can move between
       * top-level views without relying on the back link inside the client
       * component. Sticks to the right edge of the page max-width container. */}
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: 'var(--space-2xl) var(--space-xl) 0',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <AppNav />
      </div>
      <AgentsClient initial={initial} />
    </>
  );
}
