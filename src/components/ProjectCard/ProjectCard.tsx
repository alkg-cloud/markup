'use client';

import Link from 'next/link';
import { resolveIconToken } from '@/components/IconPicker/icons';
import { usePopover } from '@/lib/popover/usePopover';
import { projectHref } from '@/lib/project/routes';
import styles from './ProjectCard.module.css';

export interface ProjectCardData {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  mockupCount: number;
  folderCount: number;
}

interface ProjectCardProps {
  project: ProjectCardData;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Default project glyph — used when `Project.icon` is null OR points
 *  at an unknown token (e.g. an icon set we no longer ship). Same shape
 *  as `sidebar-tree-project-item`'s default for visual coherence. */
function DefaultProjectIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 6h12" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function ProjectIconResolved({ token }: { token: string | null }) {
  if (!token) return <DefaultProjectIcon />;
  const resolved = resolveIconToken(token);
  if (!resolved) return <DefaultProjectIcon />;
  if (resolved.type === 'emoji') return <span aria-hidden="true">{resolved.content}</span>;
  return <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: resolved.content }} />;
}

function KebabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="8" r="1.2" />
      <circle cx="8" cy="8" r="1.2" />
      <circle cx="12" cy="8" r="1.2" />
    </svg>
  );
}

/* ── Component ──────────────────────────────────────────────────────────── */

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function ProjectCard({ project, onOpen, onEdit, onDelete }: ProjectCardProps) {
  const kebab = usePopover<HTMLButtonElement, HTMLDivElement>('right');

  return (
    <div className={styles.cardWrap}>
      <Link
        href={projectHref(project.slug)}
        className={styles.card}
        aria-label={`Open project ${project.name}`}
      >
        <span className={styles.iconTile}>
          <ProjectIconResolved token={project.icon} />
        </span>
        <div className={styles.info}>
          <h2 className={styles.name} title={project.name}>
            {project.name}
          </h2>
          <div className={styles.meta}>
            {pluralize(project.mockupCount, 'mockup', 'mockups')}
            <span className={styles.metaDot}>·</span>
            {pluralize(project.folderCount, 'folder', 'folders')}
          </div>
        </div>
      </Link>

      <button
        ref={kebab.triggerRef}
        type="button"
        className={styles.kebab}
        aria-label={`Menu for ${project.name}`}
        aria-haspopup="menu"
        {...kebab.triggerProps}
      >
        <KebabIcon />
      </button>
      <div {...kebab.popoverProps} className={styles.kebabMenu} role="menu">
        <button
          type="button"
          role="menuitem"
          className={styles.kebabMenuItem}
          onClick={() => {
            kebab.close();
            onOpen();
          }}
        >
          Open
        </button>
        <button
          type="button"
          role="menuitem"
          className={styles.kebabMenuItem}
          onClick={() => {
            kebab.close();
            onEdit();
          }}
        >
          Edit
        </button>
        <div className={styles.kebabMenuDivider} />
        <button
          type="button"
          role="menuitem"
          className={styles.kebabMenuItemDanger}
          aria-label={`Delete project ${project.name}`}
          onClick={() => {
            kebab.close();
            onDelete();
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
