import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function ProjectsPage() {
  const first = await prisma.project.findFirst({
    orderBy: { position: 'asc' },
  });

  if (first) redirect(`/projects/${first.slug}`);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: 'var(--type-sm)',
      }}
    >
      Nenhum projeto encontrado.
    </div>
  );
}

export const dynamic = 'force-dynamic';
