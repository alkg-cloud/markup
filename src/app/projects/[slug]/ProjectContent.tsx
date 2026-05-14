'use client';

import MockupCard from '@/app/mockups/MockupCard';
import type { BreadcrumbSegment } from '@/components/Breadcrumbs/Breadcrumbs';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { FolderCard } from '@/components/FolderCard/FolderCard';
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
  folders: FolderSummary[];
  mockups: MockupSummary[];
  breadcrumbs: BreadcrumbSegment[];
  userName?: string;
  userEmail?: string;
}

export function ProjectContent({
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
