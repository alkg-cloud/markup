'use client';

import Link from 'next/link';
import { useState } from 'react';
import MockupCard from '@/app/mockups/MockupCard';
import { type BreadcrumbSegment, Breadcrumbs } from '@/components/Breadcrumbs/Breadcrumbs';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { Statusbar } from '@/components/Statusbar/Statusbar';

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
      {/* Toolbar with breadcrumbs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm) var(--space-xl)',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
          background: 'var(--bg-elevated)',
        }}
      >
        <Breadcrumbs segments={breadcrumbs} />
      </div>

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
                    gap: 'var(--space-md)',
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
                    gap: 'var(--space-md)',
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

function FolderCard({ folder, projectSlug }: { folder: FolderSummary; projectSlug: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={`/projects/${projectSlug}/${folder.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: 'var(--space-md)',
        background: hovered ? 'var(--surface-hover)' : 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--border)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-card)',
        textDecoration: 'none',
        color: 'inherit',
        transition:
          'background var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard)',
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{ color: 'oklch(80% 0.15 65)', flexShrink: 0 }}
      >
        <path
          d="M2 4a1 1 0 011-1h3.5l1.5 1.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 'var(--type-sm)',
            fontWeight: 'var(--weight-semibold)',
            color: 'var(--text-bright)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {folder.name}
        </div>
        <div style={{ fontSize: 'var(--type-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
          {folder.childCount} {folder.childCount === 1 ? 'item' : 'itens'}
        </div>
      </div>
    </Link>
  );
}
