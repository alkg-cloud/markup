'use client';

/**
 * `NewProjectDialog` — create or edit a project.
 *
 * Migrated from the legacy `Dialog` / `DialogField` / `DialogInput` /
 * `DialogButton` primitives to the Radix-backed compound stack:
 *
 *   <RadixDialog.Root>
 *     <RadixDialog.Portal>
 *       <RadixDialog.Overlay />
 *       <RadixDialog.Content>
 *         <RadixDialog.Title>…</RadixDialog.Title>
 *         <Form.Root>
 *           <InputField.Root> ← name (sync + server error)
 *           <div>             ← icon-picker slot
 *           <div.actions>     ← cancel + submit
 *         </Form.Root>
 *       </RadixDialog.Content>
 *     </RadixDialog.Portal>
 *   </RadixDialog.Root>
 *
 * Behaviour preserved verbatim:
 *   - Props API (`open` / `onClose` / `onSaved` / `project`).
 *   - URL_SAFE_NAME validation via `validateUrlSafeName` (allows
 *     letters, digits, hyphens, underscores).
 *   - POST `/api/projects` on create, PATCH `/api/projects/:id` on edit.
 *   - Toast on success and failure.
 *   - Submit disabled while loading or when the name is invalid.
 *
 * Visual lineage: title, name field, icon picker, and action buttons
 * are laid out in the same order as the legacy dialog — only the
 * underlying primitives changed.
 */

import * as Form from '@radix-ui/react-form';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { RadixDialog } from '@/components/Dialog/RadixDialog';
import { IconPicker } from '@/components/IconPicker/IconPicker';
import { InputField } from '@/components/InputField';
import { NameLengthCounter } from '@/components/InputField/NameLengthCounter';
import { useToast } from '@/components/Toast/useToast';
import {
  NAME_MAX_LENGTH,
  URL_SAFE_NAME_PATTERN,
  validateUrlSafeName,
} from '@/lib/validation/url-safe-name';
import styles from './NewProjectDialog.module.css';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (project: { id: string; slug: string }) => void;
  project?: { id: string; name: string; slug: string; icon: string | null };
}

// Bare-pattern form (no `^…$` anchors) for the native `pattern` attribute —
// Radix Form's `patternMismatch` matcher relies on browser ValidityState
// which already anchors the pattern. Keeps the source of truth in
// `URL_SAFE_NAME_PATTERN`.
const NAME_PATTERN = URL_SAFE_NAME_PATTERN.source.replace(/^\^|\$$/g, '');

export function NewProjectDialog({ open, onClose, onSaved, project }: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const { show } = useToast();
  const isEdit = project != null;

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? '');
    setIcon(project?.icon ?? undefined);
  }, [open, project]);

  function handleClose() {
    setName('');
    setIcon(undefined);
    onClose();
  }

  const trimmedName = name.trim();
  const nameError = useMemo(() => validateUrlSafeName(trimmedName), [trimmedName]);
  const canSubmit = trimmedName.length > 0 && !nameError;

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      const res = await fetch(isEdit ? `/api/projects/${project.id}` : '/api/projects', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, icon }),
      });
      if (!res.ok)
        throw new Error(isEdit ? 'Failed to update project' : 'Failed to create project');
      const saved = await res.json();
      handleClose();
      show(isEdit ? 'Project updated' : 'Project created');
      onSaved(saved);
    } catch {
      show(isEdit ? 'Failed to update project' : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  }

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSubmit();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) handleClose();
  };

  return (
    <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay />
        <RadixDialog.Content aria-describedby={undefined}>
          <RadixDialog.Title>{isEdit ? 'Edit Project' : 'New Project'}</RadixDialog.Title>

          <Form.Root className={styles.form} onSubmit={handleFormSubmit}>
            <InputField.Root name="name" data-state={nameError ? 'error' : undefined}>
              <InputField.Label>Project name</InputField.Label>
              <InputField.Control asChild>
                {/* RadixDialog auto-focuses the first focusable element
                    inside its Content on open, so we don't need `autoFocus`
                    on the input itself (and Biome's a11y rule forbids it). */}
                <input
                  type="text"
                  required
                  pattern={NAME_PATTERN}
                  maxLength={NAME_MAX_LENGTH}
                  placeholder="My-Project"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </InputField.Control>
              {nameError ? (
                <InputField.Message forceMatch>{nameError.message}</InputField.Message>
              ) : (
                <InputField.Help>
                  Letters, digits, hyphens, or underscores.{' '}
                  <NameLengthCounter len={trimmedName.length} />
                </InputField.Help>
              )}
              <InputField.Message match="patternMismatch">
                Use letters, digits, hyphens, or underscores only.
              </InputField.Message>
              <InputField.Message match="valueMissing">
                A project name is required.
              </InputField.Message>
            </InputField.Root>

            <div className={styles.iconField}>
              <span className={styles.iconLabel}>Icon</span>
              <IconPicker value={icon} onSelect={setIcon} />
            </div>

            <div className={styles.actions}>
              <RadixDialog.Close asChild>
                <button type="button" className={styles.btnSecondary} disabled={loading}>
                  Cancel
                </button>
              </RadixDialog.Close>
              <Form.Submit asChild>
                <button type="submit" className={styles.btnAccent} disabled={!canSubmit || loading}>
                  {isEdit ? 'Update' : 'Create'}
                </button>
              </Form.Submit>
            </div>
          </Form.Root>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
