'use client';

import type { KeyboardEvent } from 'react';
import { useEffect, useRef } from 'react';
import styles from './DemoDraftCard.module.css';
import type { Anchor } from './types';

interface Props {
  anchor: Anchor | null;
  body: string;
  onBodyChange: (body: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * Minimal in-rail draft for the landing demo. Mirrors the product's
 * draft flow (click + → pick pin spot → write body → save) without
 * the full DraftCard surface (DraftCard expects auto-save, statuses,
 * pin-count UX, etc., none of which the demo persists).
 *
 * Two visual states:
 *  - `anchor === null` (pin mode armed): hint "Click anywhere on the
 *    mockup to drop your pin"
 *  - `anchor` set: textarea + cancel/save row, save disabled when empty
 */
export function DemoDraftCard({ anchor, body, onBodyChange, onCancel, onSave }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    // Auto-focus once the user has placed a pin and we transitioned
    // into "type your body" mode.
    if (anchor) textareaRef.current?.focus();
  }, [anchor]);

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (body.trim()) onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div className={styles.card}>
      {anchor === null ? (
        <p className={styles.hint}>
          <strong>Click anywhere on the mockup</strong> to anchor your annotation.
        </p>
      ) : (
        <>
          <p className={styles.hintCompact}>Pin placed · type your annotation</p>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={body}
            placeholder="What needs fixing?"
            rows={3}
            onChange={(e) => onBodyChange(e.target.value)}
            onKeyDown={onKey}
          />
        </>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.save}
          onClick={onSave}
          disabled={!anchor || !body.trim()}
        >
          Add annotation
        </button>
      </div>
    </div>
  );
}
