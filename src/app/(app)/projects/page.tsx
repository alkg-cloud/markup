import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { projectHref } from '@/lib/project/routes';

/**
 * `/projects` — the canonical home for the projects browser. For now
 * we redirect to the first project (matching the previous root-route
 * behaviour). A dedicated "all projects" landing view can replace this
 * redirect later without breaking links.
 */
export default async function ProjectsIndex() {
  const first = await prisma.project.findFirst({ orderBy: { position: 'asc' } });
  if (!first) {
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
  redirect(projectHref(first.slug));
}

export const dynamic = 'force-dynamic';
