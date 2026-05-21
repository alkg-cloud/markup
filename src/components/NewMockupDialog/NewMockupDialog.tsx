'use client';

/**
 * `NewMockupDialog` — the integration surface that composes every
 * primitive and hook built in T2–T10 + T8 + T7 into the single
 * upload-a-mockup recipe defined in DS 25.
 *
 * Compound layers (top → bottom of the dialog body):
 *
 *   1. RadixDialog.Title + close-X button (RadixDialog.Close)
 *   2. AlertBanner.Root          — only when `globalError` is set
 *   3. FileChip                  — color-coded HTML/ZIP badge + filename
 *   4. Form.Root (Radix Form)
 *      a. InputField.Root        — name field (sync + server error states)
 *      b. pickerRow              — native <select> project + FolderPicker
 *      c. ReplaceToggle | PreviewBox
 *         - ReplaceToggle when `mode === 'replace'` + currentMockup present
 *         - PreviewBox  otherwise (state: loading|ready|fallback)
 *      d. progress bar           — only when `state.status === 'uploading'`
 *      e. dialog-actions          — Cancel + Form.Submit
 *
 * Two state machines run in parallel (see tech-spec §"Dialog state machine"):
 *
 *   - Upload state (`useUploadMockup` → `idle|uploading|success|error`).
 *   - Preview state (`useFilePreview` → `loading|ready|fallback`).
 *
 * The component is *controlled* by its parent (typically the
 * `NewMockupDialogProvider` mounted in `(app)/layout.tsx`): the parent
 * owns `open`, `file`, `target`, `mode`, etc., and the dialog reports
 * close requests via `onOpenChange`.
 *
 * Visual contract: `docs/design/design-system/25-new-mockup-dialog.html`.
 */

import * as Form from '@radix-ui/react-form';
import { useRouter } from 'next/navigation';
import {
  type FormEvent,
  type JSX,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertBanner } from '@/components/AlertBanner';
import { RadixDialog } from '@/components/Dialog/RadixDialog';
import { FolderPicker } from '@/components/FolderPicker';
import { InputField } from '@/components/InputField';
import { mockupSlugHref } from '@/lib/project/routes';
import { FileChip } from './FileChip';
import styles from './NewMockupDialog.module.css';
import { PreviewBox } from './PreviewBox';
import { type ReplaceMode, ReplaceToggle } from './ReplaceToggle';
import { useFilePreview } from './useFilePreview';
import { useFolders } from './useFolders';
import { type UploadError, type UploadState, useUploadMockup } from './useUploadMockup';

/** Navigation target hydrated from the route the drop/click came from. */
export type NewMockupDialogTarget = {
  /** Resolved project id, when known up-front. `null` ⇒ try `projectSlug`. */
  projectId: string | null;
  /** Resolved folder id, when known up-front. `null` ⇒ try `folderPath`. */
  folderId: string | null;
  /**
   * Project slug from the URL (`/projects/<slug>/…`). The URL resolver
   * (`resolveTargetFromPath`) can only produce a slug — the projects
   * list lookup turns it into an id once the projects fetch resolves.
   */
  projectSlug: string | null;
  /**
   * Ancestor-to-self folder names from the URL. Used for both (a) the
   * success-redirect URL and (b) resolving `folderId` against the
   * folder tree once it has loaded.
   */
  folderPath: string[];
};

export type NewMockupDialogProject = {
  id: string;
  slug: string;
  name: string;
  icon?: string;
};

export type NewMockupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The dropped/picked file. Required when `open` is true. */
  file: File | null;
  target: NewMockupDialogTarget;
  /** `'add'` (default) or `'replace'` — `'replace'` requires `currentMockup`. */
  mode?: ReplaceMode;
  currentMockup?: { id: string; name: string };
  /** All projects the user can post to. Rendered in the project <select>. */
  projects: NewMockupDialogProject[];
};

type GlobalError = { title: string; detail: string };

const NAME_PATTERN = '[a-z0-9-]+';

/**
 * Strip extension, lower-case, replace any non `[a-z0-9-]` run with a
 * single hyphen, and trim leading/trailing hyphens. Matches the
 * server-side slugifier closely enough for a sane default — the user
 * can still edit.
 */
function suggestNameFromFile(file: File | null): string {
  if (!file) return '';
  const base = file.name.replace(/\.[^.]+$/, '');
  return base
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function errorToBanner(error: UploadError): GlobalError {
  switch (error.kind) {
    case 'network':
      return {
        title: 'Could not upload mockup',
        detail: 'Network request failed. Check your connection and try again.',
      };
    case 'file_too_large': {
      const limitMb = Math.round(error.limit / (1024 * 1024));
      return {
        title: 'File too large',
        detail: `Mockups must be smaller than ${limitMb} MB.`,
      };
    }
    case 'unsupported_type':
      return {
        title: 'Unsupported file type',
        detail: error.detail || 'Only .html and .zip files are accepted.',
      };
    case 'forbidden':
      return {
        title: 'Not allowed',
        detail: error.detail || 'You do not have permission to upload here.',
      };
    case 'rate_limited':
      return {
        title: 'Slow down',
        detail:
          error.retryAfter !== undefined
            ? `Too many uploads. Try again in ${error.retryAfter}s.`
            : 'Too many uploads. Try again in a moment.',
      };
    case 'server_error':
      return {
        title: 'Could not upload mockup',
        detail: error.detail || 'The server returned an unexpected error.',
      };
    case 'aborted':
      return { title: 'Upload cancelled', detail: 'The request was aborted.' };
    // Field-routed errors flow into `fieldError` instead — these branches
    // are defensive only.
    case 'invalid_name':
    case 'duplicate_name':
      return { title: 'Invalid name', detail: error.detail };
  }
}

function errorToFieldMessage(error: UploadError): string {
  if (error.kind === 'invalid_name') return error.detail;
  if (error.kind === 'duplicate_name') return error.detail;
  return 'Please correct this field.';
}

function CloseGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.708.708L7.293 8l-3.647 3.646.708.708L8 8.707z" />
    </svg>
  );
}

export function NewMockupDialog(props: NewMockupDialogProps): JSX.Element {
  const {
    open,
    onOpenChange,
    file,
    target,
    mode: modeProp = 'add',
    currentMockup,
    projects,
  } = props;
  const router = useRouter();

  // Resolve `projectId` from `projectSlug` once the projects list has
  // landed. The URL resolver (`resolveTargetFromPath`) can only set the
  // slug; this is where we promote it to a canonical id so the project
  // <select> + folder fetch line up with the user's view.
  const resolvedTargetProjectId = useMemo<string | null>(() => {
    if (target.projectId !== null) return target.projectId;
    if (target.projectSlug === null) return null;
    return projects.find((p) => p.slug === target.projectSlug)?.id ?? null;
  }, [target.projectId, target.projectSlug, projects]);

  // Local form state — re-seeded each time the dialog opens. We key
  // these against `open` + `file` identity so closing/reopening with a
  // fresh file picks up the new suggested name etc.
  const [name, setName] = useState<string>(() => suggestNameFromFile(file));
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    resolvedTargetProjectId,
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(target.folderId);
  const [selectedMode, setSelectedMode] = useState<ReplaceMode>(modeProp);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<GlobalError | null>(null);

  const { state, start, abort, reset } = useUploadMockup();
  const preview = useFilePreview(open ? file : null);

  // Folder tree for whichever project is currently picked inside the
  // dialog (which may differ from the target the dialog was opened with
  // — the user can switch projects mid-flow). Per-project caching lives
  // inside `useFolders`, so flipping back to a previously-loaded
  // project is free.
  const { folders, loading: foldersLoading } = useFolders(selectedProjectId);

  // Re-seed local state whenever the dialog is (re)opened or the bound
  // file / target changes. Closing the dialog is the other side of
  // this — we also reset the upload state machine so a fresh open
  // doesn't carry over a stale error / success.
  useEffect(() => {
    if (!open) {
      reset();
      setFieldError(null);
      setGlobalError(null);
      return;
    }
    setName(suggestNameFromFile(file));
    setSelectedProjectId(resolvedTargetProjectId);
    setSelectedFolderId(target.folderId);
    setSelectedMode(modeProp);
    setFieldError(null);
    setGlobalError(null);
    // We intentionally depend only on `open` + the inputs that should
    // seed initial state. The mode prop is the source of truth on open;
    // changes after that come from `setSelectedMode`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file, resolvedTargetProjectId, target.folderId, modeProp]);

  // Late-resolution of `selectedFolderId` from `target.folderPath`:
  // when the URL only carries folder *names* (e.g. `/projects/<slug>/hero`),
  // we can't pre-select the folder until the project's folder tree has
  // loaded. Once it does, find the deepest folder whose ancestor chain
  // matches the URL path and pre-select it. Skipped once the user has
  // changed projects in the dialog — at that point the URL folder path
  // is no longer meaningful for the new project's tree.
  useEffect(() => {
    if (!open) return;
    if (selectedFolderId !== null) return;
    if (target.folderId !== null) return;
    if (target.folderPath.length === 0) return;
    if (folders.length === 0) return;
    // Only auto-resolve while the dialog's project still matches the
    // target the dialog was opened with. A manual project change
    // detaches us from the URL's folder semantics.
    if (selectedProjectId !== resolvedTargetProjectId) return;
    // Resolve segment-by-segment: each step picks the folder whose
    // name matches AND whose parentId equals the previous step's id.
    let parentId: string | null = null;
    let resolvedId: string | null = null;
    for (const segment of target.folderPath) {
      const match = folders.find((f) => f.parentId === parentId && f.name === segment);
      if (!match) {
        resolvedId = null;
        break;
      }
      resolvedId = match.id;
      parentId = match.id;
    }
    if (resolvedId !== null) setSelectedFolderId(resolvedId);
    // selectedFolderId intentionally NOT in deps — once the user picks
    // a folder we stop trying to auto-resolve.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    folders,
    target.folderId,
    target.folderPath,
    selectedProjectId,
    resolvedTargetProjectId,
  ]);

  // Route upload-state side-effects: navigate on success, populate the
  // error slots on failure. Deps are intentionally narrow — we react to
  // state-machine transitions only, not to ambient parent re-renders
  // (otherwise routerPush / setGlobalError would fire on every parent
  // render, looping). Latest closure-captured refs cover the callbacks.
  const callbacksRef = useRef({
    router,
    onOpenChange,
    targetProjectSlug: target.projectSlug,
    targetFolderPath: target.folderPath,
  });
  callbacksRef.current = {
    router,
    onOpenChange,
    targetProjectSlug: target.projectSlug,
    targetFolderPath: target.folderPath,
  };
  // Track the last state identity we reacted to so multiple re-renders
  // of the same upload state don't re-fire the navigation/error effect.
  const lastHandledRef = useRef<UploadState | null>(null);
  useEffect(() => {
    if (lastHandledRef.current === state) return;
    lastHandledRef.current = state;
    if (state.status === 'success') {
      const cb = callbacksRef.current;
      const projectSlug = state.mockup.projectSlug ?? cb.targetProjectSlug ?? 'unsorted';
      const folderPath = state.mockup.folderPath ?? cb.targetFolderPath;
      const href = mockupSlugHref(projectSlug, folderPath, state.mockup.slug);
      cb.router.push(href);
      cb.onOpenChange(false);
      return;
    }
    if (state.status === 'error') {
      if (state.route === 'field') {
        setFieldError(errorToFieldMessage(state.error));
        setGlobalError(null);
      } else {
        setGlobalError(errorToBanner(state.error));
        setFieldError(null);
      }
    }
  }, [state]);

  // Project options — labelled with the icon if present (matches DS 25
  // which shows ☕ Lumen Coffee / 📐 Helio / etc.).
  const projectOptions = useMemo(
    () =>
      projects.map((p) => ({
        ...p,
        label: p.icon ? `${p.icon} ${p.name}` : p.name,
      })),
    [projects],
  );

  const isUploading = state.status === 'uploading';
  const submitDisabled = isUploading || fieldError !== null || file === null;
  const submitLabel = isUploading ? 'Uploading…' : globalError ? 'Retry' : 'Add mockup';

  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    // Closing while idle / errored: just propagate. While uploading:
    // abort the XHR + close. (TODO: gate this behind a `ConfirmDialog`
    // — see plan §Task 14 "Cancel flow"; deferred so this task stays
    // single-commit-sized.)
    if (isUploading) abort();
    onOpenChange(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (file === null) return;

    // Clear any prior error before the next attempt so the UI doesn't
    // briefly show "stale error + new in-flight".
    setFieldError(null);
    setGlobalError(null);

    if (selectedMode === 'replace' && currentMockup) {
      start({ mode: 'replace', file, mockupId: currentMockup.id });
      return;
    }
    start({
      mode: 'add',
      file,
      name,
      projectId: selectedProjectId,
      folderId: selectedFolderId,
    });
  };

  // Reflect the upload status as a free-form suffix on the preview
  // label (the DS shows "uploading 64%", "generating…", etc.).
  const previewStatus: string | null = (() => {
    if (state.status === 'uploading') {
      return `uploading ${Math.round(state.progress * 100)}%`;
    }
    if (preview.state === 'loading') return 'generating…';
    if (preview.state === 'fallback' && preview.reason === 'zip') {
      return 'not available for ZIP';
    }
    if (preview.state === 'fallback') return 'preview unavailable';
    return null;
  })();

  // Only render the dialog *body* when there's a file to operate on;
  // RadixDialog drives the open/closed lifecycle independently so the
  // parent can mount us with `file: null` while the dialog is closed.
  const body = file ? (
    <>
      <div className={styles.head}>
        <RadixDialog.Title>New mockup</RadixDialog.Title>
        <RadixDialog.Close asChild>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Close"
            disabled={isUploading}
          >
            <CloseGlyph />
          </button>
        </RadixDialog.Close>
      </div>

      {globalError ? (
        <AlertBanner.Root status="error">
          <AlertBanner.Icon />
          <AlertBanner.Body>
            <AlertBanner.Title>{globalError.title}</AlertBanner.Title>
            <AlertBanner.Description>{globalError.detail}</AlertBanner.Description>
          </AlertBanner.Body>
          <AlertBanner.Close asChild>
            <button type="button" onClick={() => setGlobalError(null)} aria-label="Dismiss">
              <CloseGlyph />
            </button>
          </AlertBanner.Close>
        </AlertBanner.Root>
      ) : null}

      <FileChip file={file} />

      <Form.Root className={styles.form} onSubmit={handleSubmit}>
        <InputField.Root name="name" data-state={fieldError ? 'error' : undefined}>
          <InputField.Label>Name</InputField.Label>
          <InputField.Control asChild>
            <input
              type="text"
              required
              pattern={NAME_PATTERN}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (fieldError) setFieldError(null);
              }}
              disabled={isUploading || selectedMode === 'replace'}
            />
          </InputField.Control>
          <InputField.Message match="patternMismatch">
            Use lowercase letters, numbers, or hyphens only.
          </InputField.Message>
          <InputField.Message match="valueMissing">A name is required.</InputField.Message>
          {fieldError ? <InputField.Message forceMatch>{fieldError}</InputField.Message> : null}
        </InputField.Root>

        <div className={styles.pickerRow}>
          <div className={styles.selectField}>
            <label className={styles.selectLabel} htmlFor="new-mockup-project">
              Project
            </label>
            <select
              id="new-mockup-project"
              className={styles.select}
              value={selectedProjectId ?? ''}
              onChange={(event) => {
                const next = event.target.value === '' ? null : event.target.value;
                setSelectedProjectId(next);
                // Switching project invalidates the folder selection —
                // the new project owns a different folder tree.
                setSelectedFolderId(null);
              }}
              disabled={isUploading || selectedMode === 'replace'}
            >
              <option value="">— Unsorted</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.selectField}>
            {/* FolderPicker is a Radix Popover trigger, not an <input>,
                so a native <label htmlFor> can't bind to it. We render
                the visually-equivalent label as a <span> and the picker
                carries its own `aria-label="Choose folder"` for SR. */}
            <span className={styles.selectLabel}>Folder</span>
            <FolderPicker
              // Force-disable while the per-project folder tree is in
              // flight: `projectId={null}` is the picker's "disabled"
              // signal. The override is purely cosmetic — selectedProjectId
              // itself is unchanged, so the submit payload stays correct.
              projectId={foldersLoading ? null : selectedProjectId}
              folders={folders}
              value={selectedFolderId}
              onChange={setSelectedFolderId}
              triggerLabel={foldersLoading ? 'Loading folders…' : undefined}
            />
          </div>
        </div>

        {selectedMode === 'replace' && currentMockup ? (
          <ReplaceToggle
            currentMockupName={currentMockup.name}
            value={selectedMode}
            onChange={setSelectedMode}
          />
        ) : (
          <PreviewBox
            file={file}
            previewDataUrl={preview.state === 'ready' ? preview.dataUrl : null}
            isLoading={preview.state === 'loading' || isUploading}
            fallbackReason={preview.state === 'fallback' ? preview.reason : null}
            statusLabel={previewStatus}
          />
        )}

        {/* The mockup view is the only place where a `currentMockup`
            is available but the parent might still default `mode` to
            `'add'`; render the toggle so the user can flip to replace
            without re-opening the dialog. */}
        {currentMockup && selectedMode === 'add' ? (
          <ReplaceToggle
            currentMockupName={currentMockup.name}
            value={selectedMode}
            onChange={setSelectedMode}
          />
        ) : null}

        {isUploading ? (
          <div
            className={styles.progress}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(state.progress * 100)}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${Math.round(state.progress * 100)}%` }}
            />
          </div>
        ) : null}

        <div className={styles.actions}>
          <RadixDialog.Close asChild>
            <button type="button" className={styles.btnSecondary}>
              Cancel
            </button>
          </RadixDialog.Close>
          <Form.Submit asChild>
            <button
              type="submit"
              className={styles.btnAccent}
              disabled={submitDisabled}
              data-submit-label={submitLabel}
            >
              {submitLabel}
            </button>
          </Form.Submit>
        </div>
      </Form.Root>
    </>
  ) : null;

  return (
    <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay />
        <RadixDialog.Content
          aria-describedby={undefined}
          onInteractOutside={(event) => {
            // Don't close while uploading from a pointer-outside click;
            // the user must explicitly hit Cancel (matches DS 25's
            // "uploading" state note that Close is disabled).
            if (isUploading) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (isUploading) event.preventDefault();
          }}
        >
          {body}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export type { UploadState };
