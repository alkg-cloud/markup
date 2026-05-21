'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useConfirm } from '@/components/ConfirmDialog';
import { UploadEmptyState } from '@/components/EmptyState/UploadEmptyState';
import { HomeHero } from '@/components/HomeHero/HomeHero';
import { HomeOrphans } from '@/components/HomeOrphans/HomeOrphans';
import { HomeProjects } from '@/components/HomeProjects/HomeProjects';
import { HomeRecents } from '@/components/HomeRecents/HomeRecents';
import { useNewMockupDialog } from '@/components/NewMockupDialog';
import { NewProjectDialog } from '@/components/NewProjectDialog/NewProjectDialog';
import type { ProjectCardData } from '@/components/ProjectCard/ProjectCard';
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
  const { openDialog } = useNewMockupDialog();

  const [newOpen, setNewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // When the workspace has zero projects, the all-projects empty state
  // becomes the upload drop-zone-gigante from DS 26. Dropping or picking
  // a file pops `NewMockupDialog` with a null project (Unsorted) — the
  // user picks the project inside the dialog (or creates one first via
  // the existing "New project" CTA, which still renders at the
  // top-level header).
  const handleEmptyStateFile = (file: File) =>
    openDialog({
      file,
      target: {
        projectId: null,
        folderId: null,
        projectLabel: 'Unsorted',
        folderPath: [],
      },
    });

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

      <main className={styles.main} aria-label="Home">
        <HomeHero
          timeOfDay={data.greeting.timeOfDay}
          identityName={data.identity.name}
          identityEmail={data.identity.email}
          updatedSinceYesterdayCount={data.greeting.updatedSinceYesterdayCount}
        />
        <HomeRecents items={data.recents} />
        {data.projects.length === 0 ? (
          <UploadEmptyState context="all-projects" onFile={handleEmptyStateFile} />
        ) : (
          <HomeProjects
            projects={data.projects}
            onNewProject={() => setNewOpen(true)}
            onOpen={(p) => router.push(projectHref(p.slug))}
            onEdit={(p) => setEditingId(p.id)}
            onDelete={(p) => handleDelete(p)}
          />
        )}
        <HomeOrphans items={data.orphans} />
      </main>
    </div>
  );
}
