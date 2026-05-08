import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { identify } from '@/lib/auth/identify';
import { isSetupCompleted } from '@/lib/auth/setup-state';
import { prisma } from '@/lib/prisma';

export default async function MockupsPage() {
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

  const mockups = await prisma.mockup.findMany({
    where: { status: { in: ['open', 'resolved'] } },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>Mockups</h1>
        <nav style={{ display: 'flex', gap: 16 }}>
          <Link href="/settings/agents" style={{ color: 'var(--text-secondary)' }}>
            Agents
          </Link>
        </nav>
      </header>

      {mockups.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>
          No mockups yet. Upload one via <code>POST /api/mockups</code> with a session cookie or
          agent Bearer token.
        </p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
        >
          {mockups.map((m) => (
            <li
              key={m.id}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <Link href={`/mockups/${m.id}`} style={{ color: 'inherit', display: 'block' }}>
                <div
                  style={{
                    aspectRatio: '16 / 10',
                    background: 'var(--bg-primary)',
                    backgroundImage: `url(/api/mockups/${m.id}/thumbnail)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'top center',
                  }}
                />
                <div style={{ padding: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <strong>{m.name}</strong>
                    <span
                      style={{
                        fontSize: 11,
                        textTransform: 'uppercase',
                        color: m.status === 'resolved' ? 'var(--success)' : 'var(--text-secondary)',
                      }}
                    >
                      {m.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    Updated {new Date(m.updatedAt).toLocaleString()}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
