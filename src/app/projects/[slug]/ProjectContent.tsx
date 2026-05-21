'use client';

import MockupCard from '@/app/mockups/MockupCard';
import { AppMain } from '@/components/AppMain/AppMain';
import type { BreadcrumbSegment } from '@/components/Breadcrumbs/Breadcrumbs';
import { UploadEmptyState } from '@/components/EmptyState/UploadEmptyState';
import { FolderCard } from '@/components/FolderCard/FolderCard';
import { FolderHeader } from '@/components/FolderHeader/FolderHeader';
import { useNewMockupDialog } from '@/components/NewMockupDialog';
import { Topbar } from '@/components/Topbar/Topbar';
import type { DragTarget } from '@/hooks/useDragTarget';
import { mockupSlugHref } from '@/lib/project/routes';

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
  /** Ancestor folder names (root → current) used to build sub-folder
   *  URLs. Empty/undefined at the project root. */
  folderPathNames?: ReadonlyArray<string>;
  folders: FolderSummary[];
  mockups: MockupSummary[];
  breadcrumbs: BreadcrumbSegment[];
  userName?: string;
  userEmail?: string;
  userRole?: 'admin' | 'member';
}

export function ProjectContent({
  projectName,
  projectId,
  projectIcon,
  folderName,
  currentFolderId,
  projectSlug,
  folderPathNames,
  folders,
  mockups,
  breadcrumbs,
  userName,
  userEmail,
  userRole,
}: ProjectContentProps) {
  const isEmpty = folders.length === 0 && mockups.length === 0;
  const { openDialog } = useNewMockupDialog();

  // Build the dialog target from the route + payload IDs. The empty
  // state's `onFile` hands the file to the upload dialog directly;
  // the dialog will prefer the project/folder pre-resolved here over
  // re-resolving from pathname slugs.
  //
  // `folderPathNames` already includes the current folder as its last
  // entry (see `resolveProjectPath` → `pathNames`), so we use it as-is.
  const uploadTarget: DragTarget = {
    projectId,
    folderId: currentFolderId ?? null,
    projectLabel: projectName,
    folderPath: folderName ? [...(folderPathNames ?? [])] : [],
  };
  const handleEmptyStateFile = (file: File) => openDialog({ file, target: uploadTarget });

  const emptyContext: 'folder' | 'project' = folderName ? 'folder' : 'project';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        breadcrumbs={breadcrumbs}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
      />

      <AppMain variant="scroll" ariaLabel="Project workspace">
        <FolderHeader
          icon={projectIcon ?? null}
          name={folderName ?? projectName}
          count={folders.length + mockups.length}
        />
        {isEmpty ? (
          <UploadEmptyState
            context={emptyContext}
            projectLabel={projectName}
            folderLabel={folderName ?? undefined}
            onFile={handleEmptyStateFile}
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 'var(--space-sm)',
            }}
          >
            {folders.map((f) => (
              <FolderCard
                key={f.id}
                folder={f}
                projectSlug={projectSlug}
                folderPath={[...(folderPathNames ?? []), f.name]}
              />
            ))}
            {mockups.map((m) => (
              <MockupCard
                key={m.id}
                id={m.id}
                name={m.name}
                slug={m.slug}
                status={m.status}
                updatedAt={m.updatedAt}
                href={mockupSlugHref(projectSlug, folderPathNames ?? [], m.slug)}
              />
            ))}
          </div>
        )}
      </AppMain>
    </div>
  );
}
