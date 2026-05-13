'use client';

import MockupCard from '@/app/mockups/MockupCard';
import type { BreadcrumbSegment } from '@/components/Breadcrumbs/Breadcrumbs';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { FolderCard } from '@/components/FolderCard/FolderCard';
import { Statusbar } from '@/components/Statusbar/Statusbar';
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
}

export function ProjectContent({
  projectName,
  projectSlug,
  folders,
  mockups,
  breadcrumbs,
}: ProjectContentProps) {
  const isEmpty = folders.length === 0 && mockups.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar breadcrumbs={breadcrumbs} userName={projectName} />

      {/* Content */}
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
          <>
            {/* Folders section */}
            {folders.length > 0 && (
              <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <SectionHeader title="Pastas" count={folders.length} />
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
                </div>
              </div>
            )}

            {/* Mockups section */}
            {mockups.length > 0 && (
              <div>
                <SectionHeader title="Mockups" count={mockups.length} />
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
                      updatedAt={m.updatedAt}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Statusbar */}
      <Statusbar
        projectName={projectName}
        itemCount={mockups.length}
        folderCount={folders.length}
      />
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        marginBottom: 'var(--space-md)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--type-xs)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: 'var(--tracking-wide)',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {title}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      <span
        style={{
          fontSize: 'var(--type-xs)',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
        }}
      >
        {count}
      </span>
    </div>
  );
}
