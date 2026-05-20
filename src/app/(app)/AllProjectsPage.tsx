'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useConfirm } from '@/components/ConfirmDialog';
import { HomeHero } from '@/components/HomeHero/HomeHero';
import { HomeOrphans } from '@/components/HomeOrphans/HomeOrphans';
import { HomeProjects } from '@/components/HomeProjects/HomeProjects';
import { HomeRecents } from '@/components/HomeRecents/HomeRecents';
import { NewProjectDialog } from '@/components/NewProjectDialog/NewProjectDialog';
import type { ProjectCardData } from '@/components/ProjectCard/ProjectCard';
import { Topbar } from '@/components/Topbar/Topbar';
import type { HomeData } from '@/lib/home/types';
import { projectHref } from '@/lib/project/routes';
import styles from './AllProjectsPage.module.css';

interface AllProjectsPageProps {
  data: HomeData;
  /** Triggered after a mutation so the parent can refetch + rerender. */
  onMutated: () => void;
}

/**
 * `home-page` — workspace landing. Renders the 4-section dashboard
 * (HomeHero → HomeRecents → HomeProjects → HomeOrphans) full-bleed and
 * owns the project create/edit dialog state plus the delete-confirm
 * flow. The fetch lives in the page shell so this component stays a
 * pure renderer of the resolved `HomeData` payload.
 */
export function AllProjectsPage({ data, onMutated }: AllProjectsPageProps) {
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [newOpen, setNewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // n is tiny (project count, never paginated) — inline find is fine
  // and skips a useMemo identity dance for every parent rerender.
  const editingMatch = editingId ? data.projects.find((p) => p.id === editingId) : undefined;
  const editingProject = editingMatch
    ? {
        id: editingMatch.id,
        name: editingMatch.name,
        slug: editingMatch.slug,
        icon: editingMatch.icon,
      }
    : undefined;

  const handleSaved = useCallback(
    (project: { id: string; slug: string }) => {
      // Stay on `/` for edits (slug-only changes don't justify a nav);
      // navigate into the new project after create so the user can
      // immediately add mockups.
      if (editingId) {
        setEditingId(null);
        onMutated();
        return;
      }
      router.push(projectHref(project.slug));
    },
    [editingId, onMutated, router],
  );

  const handleDelete = useCallback(
    async (project: ProjectCardData) => {
      const ok = await confirm({
        title: 'Delete project',
        description: `"${project.name}" will be removed along with all its folders, mockups, versions, and annotations. This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!ok) return;
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const detail = await res
          .json()
          .then((j) => j?.detail ?? j?.error ?? 'Delete failed.')
          .catch(() => 'Delete failed.');
        await confirm({
          title: 'Could not delete',
          description: detail,
          confirmLabel: 'OK',
          cancelLabel: 'Dismiss',
        });
        return;
      }
      onMutated();
    },
    [confirm, onMutated],
  );

  return (
    <div className={styles.page}>
      {confirmDialog}
      <NewProjectDialog open={newOpen} onClose={() => setNewOpen(false)} onSaved={handleSaved} />
      <NewProjectDialog
        open={editingProject != null}
        onClose={() => setEditingId(null)}
        onSaved={handleSaved}
        project={editingProject}
      />

      <Topbar
        breadcrumbs={[]}
        userName={data.identity.name ?? undefined}
        userEmail={data.identity.email ?? undefined}
      />

      <main className={styles.main} aria-label="Home">
        <HomeHero
          timeOfDay={data.greeting.timeOfDay}
          identityName={data.identity.name}
          identityEmail={data.identity.email}
          updatedSinceYesterdayCount={data.greeting.updatedSinceYesterdayCount}
        />
        <HomeRecents items={data.recents} />
        <HomeProjects
          projects={data.projects}
          onNewProject={() => setNewOpen(true)}
          onOpen={(p) => router.push(projectHref(p.slug))}
          onEdit={(p) => setEditingId(p.id)}
          onDelete={(p) => handleDelete(p)}
        />
        <HomeOrphans items={data.orphans} />
      </main>
    </div>
  );
}
