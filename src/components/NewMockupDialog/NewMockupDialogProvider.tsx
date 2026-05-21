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
 * - Mounts a `<DropHandler>` that consumes the most-recent drop event
 *   from `DragTargetProvider` and routes valid drops into `openDialog`,
 *   surfacing invalid ones via the toast.
 *
 * Folder fetching is *not* a provider concern — the dialog itself owns
 * `useFolders(selectedProjectId)`, keyed on the project the user is
 * currently looking at inside the dialog. The provider used to manage
 * a `foldersByProject` cache, but pushing it down let the in-dialog
 * project <select> drive the fetch directly (which it didn't before).
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
  // When the caller resolved a `projectId` up-front (sidebar dropzone,
  // project-view empty state) we trust it and ignore the label. When
  // it didn't (the URL resolver, which can't map slug→id without an
  // async lookup), `projectLabel` is the URL slug — surface it as
  // `projectSlug` so the dialog can resolve the id once `/api/projects`
  // lands.
  const projectSlug =
    target.projectId === null && target.projectLabel && target.projectLabel !== 'Unsorted'
      ? target.projectLabel
      : null;
  return {
    projectId: target.projectId,
    folderId: target.folderId,
    projectSlug,
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
  //
  // Folder fetching used to live here too, keyed by projectId. It now
  // belongs to the dialog itself via `useFolders(selectedProjectId)`
  // — re-fetching on every in-dialog project switch was the bug that
  // motivated this refactor.
  const [projects, setProjects] = useState<NewMockupDialogProject[]>([]);
  const projectsFetchedRef = useRef(false);

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

  const openDialog = useCallback(
    (params: OpenDialogParams) => {
      setFile(params.file);
      const nextTarget = dragTargetToDialogTarget(params.target ?? null);
      setTarget(nextTarget);
      setMode(params.mode ?? 'add');
      setCurrentMockup(params.currentMockup);
      setOpen(true);
      // Kick off the projects fetch in the background — the dialog can
      // render immediately and fill in once the request resolves. Folder
      // fetching happens inside the dialog (per selected project).
      void ensureProjects();
    },
    [ensureProjects],
  );

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
        projects={projects}
      />
    </Context.Provider>
  );
}
