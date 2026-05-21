'use client';

import { ProjectCard, type ProjectCardData } from '@/components/ProjectCard/ProjectCard';
import styles from './HomeProjects.module.css';

/** Minimal shape consumed by `HomeProjects`. Phase 2 swaps this for
 *  the canonical `ProjectListEntry` from `@/lib/home/types`; this
 *  local alias keeps Phase 1 components compilable without depending
 *  on Task A's commit landing first. Must remain assignable to
 *  `ProjectCardData` since that's what we hand to `<ProjectCard>`. */
interface HomeProjectsProps {
  projects: ProjectCardData[];
  onNewProject: () => void;
  onOpen: (project: ProjectCardData) => void;
  onEdit: (project: ProjectCardData) => void;
  onDelete: (project: ProjectCardData) => void;
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z" />
    </svg>
  );
}

/**
 * `home-projects-section` — Projects header + count chip + new-project
 * CTA + project grid. Owns the workspace empty state: when there are
 * no projects, the section body becomes the centered SVG stack +
 * "No projects yet" + "Create your first project" CTA. The Hero
 * (and a populated Recents, if any) still render above this — the
 * empty state is per-section, not page-level.
 */
export function HomeProjects({
  projects,
  onNewProject,
  onOpen,
  onEdit,
  onDelete,
}: HomeProjectsProps) {
  const isEmpty = projects.length === 0;

  return (
    <section className={styles.section} data-section="projects">
      <header className={styles.header}>
        <h2 className={styles.title}>Projects</h2>
        <span className={styles.count}>
          {projects.length} {projects.length === 1 ? 'project' : 'projects'}
        </span>
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
          <h3 className={styles.emptyTitle}>No projects yet</h3>
          <p className={styles.emptyDesc}>
            Create your first project to start organising mockups, folders, and annotations.
          </p>
          <button type="button" className={styles.cta} onClick={onNewProject}>
            <PlusIcon />
            Create your first project
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onOpen={() => onOpen(p)}
              onEdit={() => onEdit(p)}
              onDelete={() => onDelete(p)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
