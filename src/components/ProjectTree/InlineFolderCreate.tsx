'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './InlineFolderCreate.module.css';

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
      className={styles.wrapper}
      style={{ paddingLeft: indent + 34, height: error ? 'auto' : 28 }}
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
        className={`${styles.input}${error ? ` ${styles.inputError}` : ''}`}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
