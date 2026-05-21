'use client';

/**
 * `NewMockupDialogProvider` — single-mount host for `<NewMockupDialog>`.
 *
 * The provider lives near `(app)/layout.tsx` so any descendant (sidebar
 * footer button, empty-state dropzone, the global drop overlay) can
 * pop the upload dialog via the `useNewMockupDialog()` hook without
 * having to mount its own copy of the dialog.
 *
 * Responsibilities:
 *
 * - Owns the dialog's open/close state + the current `file`, `target`,
 *   `mode`, and (optional) `currentMockup`.
 * - Lazily fetches the project list (`GET /api/projects`) on first
 *   `openDialog()` so initial page mounts stay quiet — most users
 *   never open the dialog at all.
 * - Re-fetches the folder tree (`GET /api/projects/<id>/tree`) when the
 *   user picks a different project inside the dialog; folder trees are
 *   memo-cached per project so flipping back is free.
 * - Mounts a `<DropHandler>` that consumes the most-recent drop event
 *   from `DragTargetProvider` and routes valid drops into `openDialog`,
 *   surfacing invalid ones via the toast.
 *
 * The hook is intentionally narrow — just `openDialog(params)`. Closing
 * is driven by Radix Dialog's own controls (Esc, overlay click, Cancel
 * button, the success-redirect inside the dialog).
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { FolderPickerFolder } from '@/components/FolderPicker';
import { useToast } from '@/components/Toast/useToast';
import { type DragTarget, useDragTarget, useDragTargetActions } from '@/hooks/useDragTarget';
import { validateFile } from '@/lib/upload/validate-file';
import {
  NewMockupDialog,
  type NewMockupDialogProject,
  type NewMockupDialogTarget,
} from './NewMockupDialog';
import type { ReplaceMode } from './ReplaceToggle';

/** Public params accepted by `openDialog`. */
export type OpenDialogParams = {
  file: File;
  /** Drop / route-resolved target. Falls back to "Unsorted" when absent. */
  target?: DragTarget | null;
  mode?: ReplaceMode;
  currentMockup?: { id: string; name: string };
};

export type NewMockupDialogApi = {
  openDialog: (params: OpenDialogParams) => void;
};

const Context = createContext<NewMockupDialogApi | null>(null);

/** Hook descendant components use to pop the dialog. */
export function useNewMockupDialog(): NewMockupDialogApi {
  const value = useContext(Context);
  if (!value) {
    throw new Error('useNewMockupDialog() must be called inside <NewMockupDialogProvider>');
  }
  return value;
}

// ── helpers ───────────────────────────────────────────────────────────

/** Translate a {@link DragTarget} (or null) into the dialog's prefill shape. */
function dragTargetToDialogTarget(target: DragTarget | null): NewMockupDialogTarget {
  if (!target) {
    return { projectId: null, folderId: null, projectSlug: null, folderPath: [] };
  }
  return {
    projectId: target.projectId,
    folderId: target.folderId,
    projectSlug: null, // the dialog only needs the slug for the redirect; the
    //                  upload response carries the canonical slug, so leave
    //                  this null and let the response win.
    folderPath: target.folderPath,
  };
}

/**
 * Map a {@link validateFile} rejection to user-visible toast copy.
 * `'empty'` returns `null` because zero-file drops are silent (the user
 * already cancelled or never dropped).
 */
function rejectionToast(reason: 'empty' | 'multi' | 'wrong-type' | 'too-large'): string | null {
  switch (reason) {
    case 'multi':
      return 'Drop one file at a time.';
    case 'wrong-type':
      return 'Only HTML or ZIP files are supported.';
    case 'too-large':
      return 'File too large (limit 10 MB).';
    case 'empty':
      return null;
  }
}

/**
 * Flatten the nested folder tree returned by `/api/projects/<id>/tree`
 * into the `{ id, name, parentId }` rows the `FolderPicker` expects.
 */
type TreeFolder = {
  id: string;
  name: string;
  position: number;
  children: TreeFolder[];
};

function flattenFolders(
  folders: TreeFolder[],
  parentId: string | null = null,
): FolderPickerFolder[] {
  const out: FolderPickerFolder[] = [];
  for (const f of folders) {
    out.push({ id: f.id, name: f.name, parentId });
    if (f.children?.length) out.push(...flattenFolders(f.children, f.id));
  }
  return out;
}

// ── DropHandler ───────────────────────────────────────────────────────

/**
 * Subscribes to `DragTargetProvider`'s `lastDrop` slot. On each new
 * drop, validates the file and either calls `openDialog` (success) or
 * shows a toast (rejection). Renders nothing.
 *
 * Lives inside the provider so it can call both `useNewMockupDialog`
 * and `useDragTarget` simultaneously.
 */
function DropHandler({ openDialog }: { openDialog: (p: OpenDialogParams) => void }): null {
  const state = useDragTarget();
  const { consumeDrop } = useDragTargetActions();
  const { show: showToast } = useToast();

  // Track the last drop event identity we processed so we don't loop
  // when the provider re-renders for unrelated reasons.
  const lastSeenRef = useRef<number | null>(null);

  useEffect(() => {
    const drop = state.lastDrop;
    if (!drop) return;
    if (lastSeenRef.current === drop.at) return;
    lastSeenRef.current = drop.at;
    // Drain it from the provider too so other subscribers don't fire.
    consumeDrop();

    const result = validateFile(drop.files);
    if (!result.ok) {
      const msg = rejectionToast(result.reason);
      if (msg) showToast(msg);
      return;
    }
    openDialog({ file: result.file, target: drop.target });
  }, [state.lastDrop, consumeDrop, showToast, openDialog]);

  return null;
}

// ── Provider ──────────────────────────────────────────────────────────

export function NewMockupDialogProvider({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<NewMockupDialogTarget>({
    projectId: null,
    folderId: null,
    projectSlug: null,
    folderPath: [],
  });
  const [mode, setMode] = useState<ReplaceMode>('add');
  const [currentMockup, setCurrentMockup] = useState<{ id: string; name: string } | undefined>(
    undefined,
  );

  // Project list — fetched lazily on first openDialog, cached for the
  // life of the provider. We treat it as effectively static during a
  // session; mutations elsewhere (project create / delete) re-fetch
  // their own surfaces, so a once-per-session list is fine for the
  // dialog's <select>.
  const [projects, setProjects] = useState<NewMockupDialogProject[]>([]);
  const projectsFetchedRef = useRef(false);

  // Folder tree per project — keyed by projectId. Filled on demand
  // each time the dialog's selected project changes. We cache so
  // flipping back to a previously-loaded project is free.
  const [foldersByProject, setFoldersByProject] = useState<Record<string, FolderPickerFolder[]>>(
    {},
  );

  const ensureProjects = useCallback(async () => {
    if (projectsFetchedRef.current) return;
    projectsFetchedRef.current = true;
    try {
      const res = await fetch('/api/projects', { credentials: 'include' });
      if (!res.ok) {
        // 401 is handled at the shell level (redirect to /login); other
        // failures fall through silently — the dialog can still upload
        // to the current target without showing the project switcher.
        projectsFetchedRef.current = false;
        return;
      }
      const json = (await res.json()) as { projects: NewMockupDialogProject[] };
      setProjects(json.projects);
    } catch {
      projectsFetchedRef.current = false;
    }
  }, []);

  const ensureFoldersFor = useCallback(
    async (projectId: string | null) => {
      if (!projectId) return;
      if (foldersByProject[projectId]) return;
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/tree`, {
          credentials: 'include',
        });
        if (!res.ok) return;
        const json = (await res.json()) as { folders: TreeFolder[] };
        const flat = flattenFolders(json.folders ?? []);
        setFoldersByProject((prev) => (prev[projectId] ? prev : { ...prev, [projectId]: flat }));
      } catch {
        // Network errors fall back to an empty folder list — the user
        // can still submit (FolderPicker will be empty).
      }
    },
    [foldersByProject],
  );

  const openDialog = useCallback(
    (params: OpenDialogParams) => {
      setFile(params.file);
      const nextTarget = dragTargetToDialogTarget(params.target ?? null);
      setTarget(nextTarget);
      setMode(params.mode ?? 'add');
      setCurrentMockup(params.currentMockup);
      setOpen(true);
      // Kick off data fetches in the background — the dialog can
      // render immediately with empty selectors and fill in once the
      // requests resolve.
      void ensureProjects();
      void ensureFoldersFor(nextTarget.projectId);
    },
    [ensureProjects, ensureFoldersFor],
  );

  // Whenever the bound target (re)points at a project, make sure we
  // have its folder tree. The dialog itself drives subsequent
  // project-switch fetches via the same hook — see `currentFolders`.
  useEffect(() => {
    if (open) void ensureFoldersFor(target.projectId);
  }, [open, target.projectId, ensureFoldersFor]);

  const currentFolders = useMemo<FolderPickerFolder[]>(() => {
    if (target.projectId && foldersByProject[target.projectId]) {
      return foldersByProject[target.projectId];
    }
    return [];
  }, [foldersByProject, target.projectId]);

  const api = useMemo<NewMockupDialogApi>(() => ({ openDialog }), [openDialog]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      // Clear the bound file so the next open with a different file
      // re-runs the dialog's seeding effect cleanly. Other slots are
      // re-set on the next `openDialog`.
      setFile(null);
    }
  }, []);

  return (
    <Context.Provider value={api}>
      {children}
      <DropHandler openDialog={openDialog} />
      <NewMockupDialog
        open={open}
        onOpenChange={handleOpenChange}
        file={file}
        target={target}
        mode={mode}
        currentMockup={currentMockup}
        folders={currentFolders}
        projects={projects}
      />
    </Context.Provider>
  );
}
