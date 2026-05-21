'use client';

import { useRouter } from 'next/navigation';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VscAdd, VscNewFile, VscThreeBars } from 'react-icons/vsc';
import { flattenProjectTree } from '@/components/CommandPalette/flatten';
import { useConfirm } from '@/components/ConfirmDialog';
import { NewProjectDialog } from '@/components/NewProjectDialog/NewProjectDialog';
import type { TreeMockup, TreeProject } from '@/components/ProjectTree/ProjectTree';
import { ProjectTree } from '@/components/ProjectTree/ProjectTree';
import type { RecentMockup } from '@/components/ProjectTree/RecentsSection';
import { RecentsSection } from '@/components/ProjectTree/RecentsSection';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { useToast } from '@/components/Toast/useToast';
import { projectHref } from '@/lib/project/routes';
import { ACCEPTED_EXTENSIONS } from '@/lib/upload/constants';
import { rejectionMessage } from '@/lib/upload/rejection-message';
import { validateFile } from '@/lib/upload/validate-file';
import sidebarStyles from './ProjectSidebar.module.css';

interface ProjectSidebarProps {
  projects: TreeProject[];
  orphanMockups?: TreeMockup[];
  mockupNames: Record<string, string>;
  recentMockups: Record<string, RecentMockup>;
  /** Read from the cookie on the server so SSR matches the user's
   *  persisted choice on first paint. */
  defaultCollapsed?: boolean;
  /**
   * Invoked once the footer "New mockup" picker yields a single,
   * type-and-size-valid file. T18 wires this into the
   * `NewMockupDialogProvider`; until then a missing callback simply
   * means the picker no-ops on selection (validation toasts still
   * fire). Kept optional so the sidebar can be rendered standalone
   * (tests, storybook-style harnesses) without the provider.
   */
  onUploadFile?: (file: File) => void;
}

const FILE_INPUT_ACCEPT = ACCEPTED_EXTENSIONS.join(',');

export function ProjectSidebar({
  projects,
  orphanMockups = [],
  mockupNames,
  recentMockups,
  defaultCollapsed = false,
  onUploadFile,
}: ProjectSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { show: showToast } = useToast();

  // Flat id → name lookup so the delete confirm dialog can quote the
  // target row's display name. Reuses `flattenProjectTree` (the same
  // walker the command palette uses) so we don't ship a second tree
  // traversal that can drift out of sync.
  const nodeNameById = useMemo(() => {
    const idx = new Map<string, string>();
    for (const item of flattenProjectTree(projects)) idx.set(item.id, item.name);
    for (const m of orphanMockups) idx.set(m.id, m.name);
    return idx;
  }, [projects, orphanMockups]);

  const handleProjectSaved = useCallback(
    (project: { id: string; slug: string }) => {
      router.push(projectHref(project.slug));
      router.refresh();
    },
    [router],
  );

  const handleCreateFolder = useCallback(
    async (projectId: string, parentId: string | null, name: string) => {
      const res = await fetch(`/api/projects/${projectId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Erro ao criar pasta');
      }
      router.refresh();
    },
    [router],
  );

  const handleMove = useCallback(
    async (
      dragId: string,
      dragType: 'folder' | 'mockup',
      targetParentId: string | null,
      targetProjectId: string,
      position: number,
    ) => {
      const url =
        dragType === 'folder' ? `/api/folders/${dragId}/move` : `/api/mockups/${dragId}/move`;
      const body =
        dragType === 'folder'
          ? { parentId: targetParentId, position }
          : { projectId: targetProjectId, folderId: targetParentId, position };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Erro ao mover item');
      }
      router.refresh();
    },
    [router],
  );

  const handleRename = useCallback(
    async (nodeId: string, nodeType: 'folder' | 'mockup', name: string) => {
      const res = await fetch(
        nodeType === 'folder' ? `/api/folders/${nodeId}` : `/api/mockups/${nodeId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Erro ao renomear item');
      }
      router.refresh();
    },
    [router],
  );

  // Per-noun copy is centralised so the danger dialog stays consistent
  // across project / folder / mockup. The dialog itself comes from
  // `useConfirm` (styled Radix alert) — never `window.confirm`.
  const handleDelete = useCallback(
    async (nodeId: string, nodeType: 'project' | 'folder' | 'mockup') => {
      const name = nodeNameById.get(nodeId) ?? 'this item';
      const DELETE_COPY = {
        project: {
          api: `/api/projects/${nodeId}`,
          description: `"${name}" will be removed along with all its folders, mockups, versions, and annotations. This cannot be undone.`,
        },
        folder: {
          api: `/api/folders/${nodeId}`,
          description: `"${name}" and every mockup it contains (including their versions and annotations) will be removed. This cannot be undone.`,
        },
        mockup: {
          api: `/api/mockups/${nodeId}`,
          description: `"${name}" will be removed along with every version and annotation it owns. This cannot be undone.`,
        },
      } as const;
      const copy = DELETE_COPY[nodeType];
      const ok = await confirm({
        title: `Delete ${nodeType}`,
        description: copy.description,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!ok) return;
      const res = await fetch(copy.api, { method: 'DELETE' });
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
      router.refresh();
    },
    [confirm, nodeNameById, router],
  );

  useEffect(() => {
    if (mobileOpen && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    } else if (!mobileOpen && dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [mobileOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      setMobileOpen(false);
      hamburgerRef.current?.focus();
    };
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, []);

  // Files chosen via the hidden picker flow through `validateFile`
  // before reaching the parent. Invalid files toast; valid ones invoke
  // the upload callback (mounted by T18). The input is reset
  // unconditionally so picking the same file twice in a row still
  // fires `change`.
  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) {
        event.target.value = '';
        return;
      }
      const result = validateFile(files);
      if (result.ok) {
        onUploadFile?.(result.file);
      } else {
        const msg = rejectionMessage(result.reason);
        if (msg) showToast(msg);
      }
      event.target.value = '';
    },
    [onUploadFile, showToast],
  );

  const handleOpenFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const projectsInlineLabel = (
    <div className={sidebarStyles.projectsInlineLabel}>
      <span>Projects</span>
      <button
        type="button"
        className={sidebarStyles.inlinePlusBtn}
        aria-label="New project"
        data-tooltip="New project"
        data-tooltip-align="right"
        onClick={() => setNewProjectOpen(true)}
      >
        <VscAdd size={11} aria-hidden="true" />
      </button>
    </div>
  );

  const treeContent = (
    <>
      {projectsInlineLabel}
      <ProjectTree
        projects={projects}
        orphanMockups={orphanMockups}
        mockupNames={mockupNames}
        onCreateFolder={handleCreateFolder}
        onMove={handleMove}
        onRename={handleRename}
        onEditProject={setEditingProjectId}
        onDelete={handleDelete}
      />
      {projects.length > 0 && (
        // `key` remounts the section when the active project slug
        // changes so the localStorage-fed recents list re-reads from
        // the new key without a sync useEffect inside the hook.
        <RecentsSection
          key={projects[0].slug}
          projectSlug={projects[0].slug}
          mockups={recentMockups}
        />
      )}
    </>
  );

  // The footer is rendered twice (desktop Sidebar + mobile drawer)
  // so the hidden `<input type="file">` is hoisted to a single,
  // top-level mount below to keep `fileInputRef` pointing at exactly
  // one element across both view modes.
  const footerContent = (
    <button
      type="button"
      className={sidebarStyles.btnNewMockup}
      aria-label="New mockup"
      data-tooltip="Upload mockup"
      data-tooltip-align="center"
      onClick={handleOpenFilePicker}
    >
      <VscNewFile size={14} aria-hidden="true" />
      New mockup
    </button>
  );

  return (
    <div>
      {confirmDialog}
      <NewProjectDialog
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onSaved={handleProjectSaved}
      />
      <NewProjectDialog
        open={editingProjectId != null}
        onClose={() => setEditingProjectId(null)}
        onSaved={handleProjectSaved}
        project={projects.find((project) => project.id === editingProjectId)}
      />
      {/* Single hidden file picker shared by desktop + mobile footer
          buttons (the picker is route-agnostic, so one mount suffices
          and `fileInputRef.current` resolves unambiguously). */}
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        className={sidebarStyles.hiddenFileInput}
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileInputChange}
      />
      {/* Desktop: pill-morph sidebar */}
      <Sidebar footer={footerContent} defaultCollapsed={defaultCollapsed}>
        {treeContent}
      </Sidebar>

      {/* Mobile hamburger */}
      <button
        ref={hamburgerRef}
        type="button"
        aria-label="Open navigation menu"
        onClick={() => setMobileOpen(true)}
        className="project-sidebar-hamburger"
        style={{
          display: 'none',
          position: 'fixed',
          top: 'var(--space-sm)',
          left: 'var(--space-sm)',
          zIndex: 50,
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-xs)',
          background: 'var(--btn-bg)',
          color: 'var(--text-dim)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <VscThreeBars size={18} aria-hidden="true" />
      </button>

      {/* Mobile drawer */}
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-label="Navigation menu"
        onClick={(e) => {
          if (e.target === dialogRef.current) setMobileOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setMobileOpen(false);
        }}
        className="project-sidebar-drawer"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          border: 'none',
          background: 'transparent',
          padding: 0,
          margin: 0,
          maxWidth: '100vw',
          maxHeight: '100vh',
          width: '100vw',
          height: '100vh',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'oklch(0% 0 0 / 0.6)',
          }}
        />
        <div
          style={{
            position: 'relative',
            width: 'var(--sidebar-width)',
            height: '100%',
            background: 'var(--bg-elevated)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'absolute',
              top: 'var(--space-xs)',
              right: 'var(--space-xs)',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-xs)',
              background: 'none',
              color: 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              zIndex: 1,
            }}
          >
            ✕
          </button>
          {/* The mobile drawer no longer hosts a fixed "Projects" header
              — the label has moved inline into the scroll content
              (`projectsInlineLabel`) so both desktop and mobile share
              the same singular DS-01 recipe. */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--border) transparent',
              paddingTop: 'var(--space-md)',
            }}
          >
            {treeContent}
          </div>
          <div className={sidebarStyles.mobileFooter}>{footerContent}</div>
        </div>
      </dialog>

      <style>{`
        @media (max-width: 767px) {
          .project-sidebar-hamburger { display: flex !important; }
        }
        @media (min-width: 768px) {
          .project-sidebar-drawer { display: none !important; }
        }
        .project-sidebar-drawer::backdrop { background: transparent; }
      `}</style>
    </div>
  );
}
