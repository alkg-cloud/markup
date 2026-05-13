'use client';

import { useState } from 'react';
import { Dialog, DialogField, DialogInput } from '@/components/Dialog/Dialog';
import { IconPicker } from '@/components/IconPicker/IconPicker';
import { useToast } from '@/components/Toast/useToast';
import styles from './NewProjectDialog.module.css';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: { id: string; slug: string }) => void;
}

export function NewProjectDialog({ open, onClose, onCreated }: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  function handleClose() {
    setName('');
    setIcon(undefined);
    onClose();
  }

  async function handleSubmit() {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), icon }),
      });
      if (!res.ok) throw new Error('Failed to create project');
      const project = await res.json();
      handleClose();
      show('Project created');
      onCreated(project);
    } catch {
      show('Failed to create project');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New Project"
      actions={
        <>
          <button type="button" className={styles.btnSecondary} onClick={handleClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnAccent}
            disabled={!name.trim() || loading}
            onClick={handleSubmit}
          >
            Create project
          </button>
        </>
      }
    >
      <DialogField label="Project name">
        <DialogInput
          autoFocus
          placeholder="My project"
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
