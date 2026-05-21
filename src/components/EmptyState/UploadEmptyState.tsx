'use client';

/**
 * `UploadEmptyState` — DS 26 implementation.
 *
 * Renders the drop-zone-gigante that replaces the view content when an
 * all-projects / project / folder view has zero mockups. The dropzone
 * is both a drop target (via `dragenter`/`dragover`/`drop` handlers)
 * and a click affordance for the system file picker (via a wrapping
 * `<label>` over a visually-hidden native `<input type="file">`).
 *
 * Validation: every file (drop or picker) is funnelled through
 * {@link validateFile}; rejections surface as toasts (multi /
 * wrong-type / too-large). Successful single-file selections call the
 * consumer's `onFile` callback.
 *
 * Keyboard: the `<label>` carries `tabindex="0"` + `role="button"` and
 * forwards Enter / Space to `inputRef.current.click()`. The native
 * `<input>` has `tabindex="-1"` so it's out of the tab order — the
 * dropzone label is the single keyboard-reachable target.
 */

import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactElement,
  useRef,
} from 'react';
import { useToast } from '@/components/Toast/useToast';
import { rejectionMessage } from '@/lib/upload/rejection-message';
import { validateFile } from '@/lib/upload/validate-file';
import styles from './UploadEmptyState.module.css';

export type EmptyContext = 'all-projects' | 'project' | 'folder';

export type UploadEmptyStateProps = {
  context: EmptyContext;
  /** Required when context is 'project' or 'folder'. */
  projectLabel?: string;
  /** Required when context is 'folder'. */
  folderLabel?: string;
  /** Invoked with a single validated File. */
  onFile: (file: File) => void;
};

interface Copy {
  title: string;
  sub: string;
  ariaLabel: string;
}

function copyFor(props: UploadEmptyStateProps): Copy {
  const project = props.projectLabel ?? '';
  const folder = props.folderLabel ?? '';
  switch (props.context) {
    case 'all-projects':
      return {
        title: 'Drop your first mockup here',
        sub: 'or click to choose a file',
        ariaLabel: 'Upload your first mockup',
      };
    case 'project':
      return {
        title: `No mockups in ${project} yet`,
        sub: 'Drop an HTML or click to upload to this project',
        ariaLabel: `Upload mockup to ${project}`,
      };
    case 'folder':
      return {
        title: `${folder} is empty`,
        sub: 'Drop an HTML or click to upload to this folder',
        ariaLabel: `Upload mockup to ${folder}`,
      };
  }
}

export function UploadEmptyState(props: UploadEmptyStateProps): ReactElement {
  const { onFile } = props;
  const { title, sub, ariaLabel } = copyFor(props);
  const inputRef = useRef<HTMLInputElement>(null);
  const { show } = useToast();

  const ingest = (files: FileList | File[]): void => {
    const result = validateFile(files);
    if (result.ok) {
      onFile(result.file);
      return;
    }
    const msg = rejectionMessage(result.reason);
    if (msg) show(msg);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return; // user cancelled picker — silent
    ingest(files);
    // Allow re-selecting the same file (the change event won't fire otherwise).
    e.currentTarget.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>): void => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files) ingest(files);
  };

  const preventDefault = (e: DragEvent<HTMLLabelElement>): void => {
    e.preventDefault();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLLabelElement>): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    inputRef.current?.click();
  };

  return (
    <div className={styles.root} data-empty-context={props.context}>
      {/*
        biome-ignore lint/a11y/useSemanticElements: a <button> cannot legally wrap <input type="file"> — the label-forwarding click pattern this design requires needs role="button" on <label>.
      */}
      <label
        className={styles.drop}
        tabIndex={0}
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: <label> wraps the hidden file input — role="button" + tabIndex=0 give DS 26's single keyboard target.
        role="button"
        aria-label={ariaLabel}
        onDragEnter={preventDefault}
        onDragOver={preventDefault}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.icon} aria-hidden="true">
          {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon — parent div is aria-hidden so the SVG is excluded from the a11y tree. */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path
              d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className={styles.title}>{title}</div>
        <div className={styles.sub}>{sub}</div>
        <input
          ref={inputRef}
          type="file"
          accept=".html,.zip"
          tabIndex={-1}
          className={styles.input}
          onChange={handleChange}
        />
      </label>
    </div>
  );
}
