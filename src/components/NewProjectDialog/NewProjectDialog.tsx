'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogButton, DialogField, DialogInput } from '@/components/Dialog/Dialog';
import { IconPicker } from '@/components/IconPicker/IconPicker';
import { useToast } from '@/components/Toast/useToast';
import { validateUrlSafeName } from '@/lib/validation/url-safe-name';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (project: { id: string; slug: string }) => void;
  project?: { id: string; name: string; slug: string; icon: string | null };
}

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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Project' : 'New Project'}
      actions={
        <>
          <DialogButton onClick={handleClose}>Cancel</DialogButton>
          <DialogButton variant="accent" disabled={!canSubmit || loading} onClick={handleSubmit}>
            {isEdit ? 'Update' : 'Create'}
          </DialogButton>
        </>
      }
    >
      <DialogField
        label="Project name"
        hint="Letters, digits, hyphens, or underscores."
        error={nameError?.message ?? null}
      >
        <DialogInput
          autoFocus
          placeholder="My-Project"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />
      </DialogField>
      <DialogField label="Icon">
        <IconPicker value={icon} onSelect={setIcon} />
      </DialogField>
    </Dialog>
  );
}
