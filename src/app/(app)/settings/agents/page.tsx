import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Topbar } from '@/components/Topbar/Topbar';
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
    select: {
      id: true,
      name: true,
      prefix: true,
      lastFour: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  const initial = tokens.map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    lastFour: t.lastFour,
    createdAt: t.createdAt.toISOString(),
    lastUsedAt: t.lastUsedAt ? t.lastUsedAt.toISOString() : null,
  }));
  const user = await prisma.user.findUnique({
    where: { id: id.userId },
    select: { name: true, email: true },
  });

  return (
    <>
      <Topbar
        breadcrumbs={[{ label: 'Agent Tokens', href: '/settings/agents' }]}
        userName={user?.name ?? undefined}
        userEmail={user?.email ?? undefined}
      />
      <AgentsClient initialTokens={initial} />
    </>
  );
}

export const dynamic = 'force-dynamic';
