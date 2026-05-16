'use client';

import MockupCard from '@/app/mockups/MockupCard';
import type { BreadcrumbSegment } from '@/components/Breadcrumbs/Breadcrumbs';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { FolderCard } from '@/components/FolderCard/FolderCard';
import { FolderHeader } from '@/components/FolderHeader/FolderHeader';
import { Topbar } from '@/components/Topbar/Topbar';

interface FolderSummary {
  id: string;
  name: string;
  childCount: number;
}

interface MockupSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  updatedAt: string;
  annotationCount: number;
}

interface ProjectContentProps {
  projectName: string;
  projectSlug: string;
  projectId: string;
  projectIcon?: string | null;
  /** When viewing a sub-folder, the folder name to show in the header. */
  folderName?: string | null;
  /** The current folder ID when viewing a sub-folder; null/undefined at project root. */
  currentFolderId?: string | null;
  folders: FolderSummary[];
  mockups: MockupSummary[];
  breadcrumbs: BreadcrumbSegment[];
  userName?: string;
  userEmail?: string;
}

export function ProjectContent({
  projectName,
  projectIcon,
  folderName,
  projectSlug,
  folders,
  mockups,
  breadcrumbs,
  userName,
  userEmail,
}: ProjectContentProps) {
  const isEmpty = folders.length === 0 && mockups.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar breadcrumbs={breadcrumbs} userName={userName} userEmail={userEmail} />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-xl)',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent',
        }}
      >
        <FolderHeader
          icon={projectIcon ?? null}
          name={folderName ?? projectName}
          count={folders.length + mockups.length}
        />
        {isEmpty ? (
          <EmptyState variant="project" />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 'var(--space-sm)',
            }}
          >
            {folders.map((f) => (
              <FolderCard key={f.id} folder={f} projectSlug={projectSlug} />
            ))}
            {mockups.map((m) => (
              <MockupCard
                key={m.id}
                id={m.id}
                name={m.name}
                slug={m.slug}
                status={m.status}
                updatedAt={m.updatedAt}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
