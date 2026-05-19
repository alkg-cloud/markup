'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useConfirm } from '@/components/ConfirmDialog';
import { NewProjectDialog } from '@/components/NewProjectDialog/NewProjectDialog';
import { ProjectCard, type ProjectCardData } from '@/components/ProjectCard/ProjectCard';
import { Topbar } from '@/components/Topbar/Topbar';
import { useIdentity } from '@/lib/hooks/use-require-auth';
import { projectHref } from '@/lib/project/routes';
import styles from './AllProjectsPage.module.css';

interface AllProjectsPageProps {
  projects: ProjectCardData[];
  /** Triggered after a mutation so the parent can refetch + rerender. */
  onMutated: () => void;
}

/**
 * `all-projects` — workspace landing. Renders the project-card grid +
 * "New project" CTA, owns the project create/edit dialog state and
 * delete-confirm flow. The fetch lives in the page shell so this
 * component stays a pure renderer of the resolved payload.
 */
export function AllProjectsPage({ projects, onMutated }: AllProjectsPageProps) {
  const router = useRouter();
  const identity = useIdentity();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [newOpen, setNewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // n is tiny (project count, never paginated) — inline find is fine
  // and skips a useMemo identity dance for every parent rerender.
  const editingMatch = editingId ? projects.find((p) => p.id === editingId) : undefined;
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

  const isEmpty = projects.length === 0;

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

      <Topbar breadcrumbs={[]} userName={identity?.name} userEmail={identity?.email} />

      <main className={styles.main} aria-label="All projects">
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1 className={styles.title}>Projects</h1>
            <span className={styles.count}>
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>
          {!isEmpty && (
            <button
              type="button"
              className={styles.cta}
              onClick={() => setNewOpen(true)}
              aria-label="Create a new project"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z" />
              </svg>
              New project
            </button>
          )}
        </header>

        {isEmpty ? (
          <div className={styles.empty}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden="true"
              className={styles.emptyIcon}
            >
              <rect
                x="9"
                y="18"
                width="46"
                height="34"
                rx="6"
                stroke="var(--border-strong)"
                strokeWidth="2"
              />
              <rect
                x="6"
                y="14"
                width="46"
                height="34"
                rx="6"
                stroke="var(--border)"
                strokeWidth="1.5"
              />
              <rect
                x="3"
                y="10"
                width="46"
                height="34"
                rx="6"
                stroke="var(--border-subtle)"
                strokeWidth="1"
              />
            </svg>
            <h2 className={styles.emptyTitle}>No projects yet</h2>
            <p className={styles.emptyDesc}>
              Create your first project to start organising mockups, folders, and annotations.
            </p>
            <button type="button" className={styles.cta} onClick={() => setNewOpen(true)}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z" />
              </svg>
              Create your first project
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => router.push(projectHref(p.slug))}
                onEdit={() => setEditingId(p.id)}
                onDelete={() => handleDelete(p)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
