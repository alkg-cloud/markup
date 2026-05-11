'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface InlineFolderCreateProps {
  indent: number;
  onConfirm: (name: string) => Promise<void>;
  onCancel: () => void;
}

export function InlineFolderCreate({ indent, onConfirm, onCancel }: InlineFolderCreateProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (trimmed.length > 255) {
      setValue(trimmed.slice(0, 255));
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(trimmed.slice(0, 255));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar pasta';
      if (msg.includes('name_exists')) {
        setError('Já existe uma pasta com esse nome aqui.');
      } else {
        setError(msg);
      }
      setSubmitting(false);
    }
  }, [value, onConfirm]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        paddingLeft: indent + 34,
        paddingRight: 'var(--space-sm)',
        height: error ? 'auto' : 28,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Nome da pasta"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        disabled={submitting}
        style={{
          height: 24,
          fontSize: 'var(--type-sm)',
          fontFamily: 'var(--font-body)',
          background: 'var(--surface-input)',
          border: error ? '1px solid var(--danger)' : '1px solid var(--border)',
          borderRadius: 'var(--radius-xs)',
          color: 'var(--text)',
          padding: '0 var(--space-xs)',
          outline: 'none',
        }}
      />
      {error && (
        <span
          style={{
            fontSize: 'var(--type-2xs)',
            color: 'var(--danger)',
            marginTop: 2,
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
