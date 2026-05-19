'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NewProjectDialog } from '@/components/NewProjectDialog/NewProjectDialog';
import type { TreeMockup, TreeProject } from '@/components/ProjectTree/ProjectTree';
import { ProjectTree } from '@/components/ProjectTree/ProjectTree';
import type { RecentMockup } from '@/components/ProjectTree/RecentsSection';
import { RecentsSection } from '@/components/ProjectTree/RecentsSection';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { ToastProvider } from '@/components/Toast/useToast';
import { projectHref } from '@/lib/project/routes';
import sidebarStyles from './ProjectSidebar.module.css';

interface ProjectSidebarProps {
  projects: TreeProject[];
  orphanMockups?: TreeMockup[];
  mockupNames: Record<string, string>;
  recentMockups: Record<string, RecentMockup>;
  /** Read from the cookie on the server so SSR matches the user's
   *  persisted choice on first paint. */
  defaultCollapsed?: boolean;
}

export function ProjectSidebar({
  projects,
  orphanMockups = [],
  mockupNames,
  recentMockups,
  defaultCollapsed = false,
}: ProjectSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

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

  const treeContent = (
    <>
      <ProjectTree
        projects={projects}
        orphanMockups={orphanMockups}
        mockupNames={mockupNames}
        onCreateFolder={handleCreateFolder}
        onMove={handleMove}
        onRename={handleRename}
        onEditProject={setEditingProjectId}
      />
      {projects.length > 0 && (
        <RecentsSection projectSlug={projects[0].slug} mockups={recentMockups} />
      )}
    </>
  );

  const footerContent = (
    <button
      type="button"
      className={sidebarStyles.btnNewProject}
      aria-label="New project"
      onClick={() => setNewProjectOpen(true)}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z" />
      </svg>
      New Project
    </button>
  );

  return (
    <div>
      <ToastProvider>
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
        {/* Desktop: pill-morph sidebar */}
        <Sidebar footer={footerContent} defaultCollapsed={defaultCollapsed}>
          {treeContent}
        </Sidebar>

        {/* Mobile hamburger */}
        <button
          ref={hamburgerRef}
          type="button"
          aria-label="Abrir menu de navegação"
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
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M3 5h12M3 9h12M3 13h12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Mobile drawer */}
        <dialog
          ref={dialogRef}
          aria-modal="true"
          aria-label="Menu de navegação"
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
              aria-label="Fechar menu"
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-xs) var(--space-sm) var(--space-xs) var(--space-md)',
                borderBottom: '1px solid var(--border-subtle)',
                flexShrink: 0,
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
                Projetos
              </span>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--border) transparent',
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
      </ToastProvider>
    </div>
  );
}
