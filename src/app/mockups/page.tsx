import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppNav } from '@/components/AppNav/AppNav';
import { identify } from '@/lib/auth/identify';
import { isSetupCompleted } from '@/lib/auth/setup-state';
import { prisma } from '@/lib/prisma';
import MockupCard from './MockupCard';

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
    <main
      style={{
        maxWidth: 'var(--content-max)',
        margin: '0 auto',
        padding: '56px 32px',
      }}
    >
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 'var(--space-xl)',
          marginBottom: 'var(--space-3xl)',
        }}
      >
        {/* Left: heading + subtitle */}
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--type-3xl)',
              fontWeight: 'var(--weight-bold)',
              letterSpacing: 'var(--tracking-tighter)',
              lineHeight: 'var(--leading-tight)',
              color: 'var(--text-bright)',
              margin: 0,
            }}
          >
            Mockups
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--type-md)',
              color: 'var(--text-dim)',
              margin: 'var(--space-xs) 0 0',
              lineHeight: 'var(--leading-snug)',
            }}
          >
            Review surfaces for the team&rsquo;s open mockups.
          </p>
        </div>

        {/* Right: shared navlinks (also rendered on /settings/agents) */}
        <AppNav />
      </header>

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {mockups.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-lg)',
            padding: 'var(--space-4xl) var(--space-xl)',
            textAlign: 'center',
          }}
        >
          {/* Stack-of-cards outline SVG */}
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            aria-hidden="true"
            style={{ opacity: 0.45 }}
          >
            <rect
              x="12"
              y="20"
              width="56"
              height="40"
              rx="6"
              stroke="var(--border-strong)"
              strokeWidth="2"
            />
            <rect
              x="8"
              y="15"
              width="56"
              height="40"
              rx="6"
              stroke="var(--border)"
              strokeWidth="1.5"
            />
            <rect
              x="4"
              y="10"
              width="56"
              height="40"
              rx="6"
              stroke="var(--border-subtle)"
              strokeWidth="1"
            />
            <rect x="20" y="32" width="20" height="2.5" rx="1.25" fill="var(--border-strong)" />
            <rect x="20" y="39" width="32" height="2.5" rx="1.25" fill="var(--border)" />
            <rect x="20" y="46" width="26" height="2.5" rx="1.25" fill="var(--border)" />
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            <h2
              style={{
                fontSize: 'var(--type-lg)',
                fontWeight: 'var(--weight-semibold)',
                color: 'var(--text-bright)',
                margin: 0,
              }}
            >
              No mockups yet
            </h2>
            <p
              style={{
                fontSize: 'var(--type-md)',
                color: 'var(--text-dim)',
                margin: 0,
                maxWidth: 360,
              }}
            >
              Upload via the API to get started.
            </p>
          </div>

          {/* Copyable curl snippet */}
          <div
            style={{
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-sm) var(--space-md)',
              maxWidth: 560,
              width: '100%',
              textAlign: 'left',
            }}
          >
            <p
              style={{
                fontSize: 'var(--type-2xs)',
                fontWeight: 'var(--weight-bold)',
                color: 'var(--text-muted)',
                letterSpacing: 'var(--tracking-wide)',
                textTransform: 'uppercase',
                margin: '0 0 var(--space-xs)',
              }}
            >
              Upload via API
            </p>
            <code
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--type-xs)',
                color: 'var(--text-dim)',
                lineHeight: 'var(--leading-loose)',
                display: 'block',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {`curl -X POST https://your-host/api/mockups \\
  -H "Authorization: Bearer <agent-token>" \\
  -F "name=My Mockup" \\
  -F "file=@mockup.zip"`}
            </code>
          </div>
        </div>
      ) : (
        /* ── Card grid ──────────────────────────────────────────────────── */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 'var(--space-sm)',
          }}
        >
          {mockups.map((m) => (
            <MockupCard
              key={m.id}
              id={m.id}
              name={m.name}
              slug={m.slug}
              status={m.status}
              updatedAt={m.updatedAt.toISOString()}
            />
          ))}
        </div>
      )}
    </main>
  );
}

export const dynamic = 'force-dynamic';
