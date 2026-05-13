'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogField, DialogInput } from '@/components/Dialog/Dialog';
import { IconPicker } from '@/components/IconPicker/IconPicker';
import { useToast } from '@/components/Toast/useToast';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: { id: string; slug: string }) => void;
}

export function NewProjectDialog({ open, onClose, onCreated }: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setName('');
      setIcon('');
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), icon: icon || undefined }),
      });
      if (!res.ok) {
        const body = await res.json();
        toast.show(body.error ?? 'Erro ao criar projeto');
        return;
      }
      const project = await res.json();
      toast.show('Project created');
      onCreated(project);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [name, icon, submitting, toast, onCreated, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && name.trim()) handleSubmit();
    },
    [name, handleSubmit],
  );

  const canSubmit = name.trim().length > 0 && !submitting;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New Project"
      actions={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn-accent" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? 'Creating…' : 'Create project'}
          </button>
        </>
      }
    >
      <DialogField label="Project name">
        <DialogInput
          // biome-ignore lint/a11y/noAutofocus: dialog input should be focused on open
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="My project"
          autoComplete="off"
        />
      </DialogField>
      <DialogField label="Icon">
        <IconPicker value={icon || undefined} onSelect={setIcon} />
      </DialogField>
    </Dialog>
  );
}
