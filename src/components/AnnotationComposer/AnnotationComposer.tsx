'use client';
import { useEffect, useRef, useState } from 'react';
import type { Anchor } from '@/lib/anchoring';
import styles from './AnnotationComposer.module.css';

export interface AnnotationComposerProps {
  open: boolean;
  /** Whether marking mode is active (fades the panel out, scrim transparent). */
  marking: boolean;
  /** Pending pins captured so far in marking mode — drives the morph
   *  button label ("Add pin" / "Edit pin" / "Edit pins") and the pin
   *  count footer. */
  pendingPins: Anchor[];

  /** Called when user toggles INTO marking mode. */
  onEnterMarking: () => void;
  /** Called on Cancel / scrim click / × button / Esc when not marking. */
  onCancel: () => void;
  /** Called when user posts the annotation. Receives the body text. */
  onPost: (body: string) => void;
}

/**
 * AnnotationComposer — modal-first creation flow.
 *
 * State machine:
 *   open=false                 → hidden
 *   open=true, marking=false   → panel visible, scrim 55%, textarea focused
 *   open=true, marking=true    → panel opacity 0, scrim opacity 0, canvas
 *                                receives pin-drop clicks (parent owns
 *                                the canvas click handler and updates
 *                                pendingPins)
 *
 * See `docs/superpowers/specs/2026-05-18-app-main-redesign-spec.md` §7.
 */
export function AnnotationComposer({
  open,
  marking,
  pendingPins,
  onEnterMarking,
  onCancel,
  onPost,
}: AnnotationComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [body, setBody] = useState('');

  // Focus the textarea on open. Reset body when the composer closes.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => textareaRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
    setBody('');
    return undefined;
  }, [open]);

  // Esc: exits marking if marking, else closes the composer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (marking) {
        // Parent owns marking state; signal via onEnterMarking acts as toggle.
        onEnterMarking();
      } else {
        onCancel();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, marking, onCancel, onEnterMarking]);

  const pinCount = pendingPins.length;
  const pinCountLabel =
    pinCount === 0
      ? 'No pin attached'
      : `Pinned to ${pinCount} location${pinCount === 1 ? '' : 's'}`;
  const morphLabel = pinCount === 0 ? 'Add pin' : pinCount === 1 ? 'Edit pin' : 'Edit pins';
  const morphTooltip =
    pinCount === 0
      ? 'Add a pin on the canvas'
      : pinCount === 1
        ? 'Edit pin · click the pin on canvas to remove'
        : 'Edit pins · click a pin on canvas to remove it';

  return (
    <div
      className={[styles.composer, open && styles.open, marking && styles.marking]
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Create annotation"
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: scrim is decorative;
            keyboard close lands on Esc (wired below) — the click is a
            mouse-only convenience. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: see Esc handler. */}
      <div
        className={styles.scrim}
        onClick={() => {
          if (!marking) onCancel();
        }}
      />
      <div className={styles.panel}>
        <header className={styles.head}>
          <span className={styles.title}>New annotation</span>
          <button
            type="button"
            className={styles.close}
            onClick={onCancel}
            data-tooltip="Close (Esc)"
            aria-label="Close"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" />
            </svg>
          </button>
        </header>

        <div className={styles.body}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder="What's wrong here? What would you change?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <div className={styles.pins}>
            <span
              className={[styles.pinsLabel, pinCount > 0 && styles.hasPins]
                .filter(Boolean)
                .join(' ')}
            >
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 1a4 4 0 0 0-4 4c0 2.5 4 9 4 9s4-6.5 4-9a4 4 0 0 0-4-4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
              </svg>
              {pinCountLabel}
            </span>
            <button
              type="button"
              className={[styles.markingToggle, pinCount > 0 && styles.hasPins]
                .filter(Boolean)
                .join(' ')}
              onClick={onEnterMarking}
              data-tooltip={morphTooltip}
              aria-label={morphLabel}
            >
              <svg
                className={styles.addIcon}
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z" />
              </svg>
              <svg
                className={styles.editIcon}
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M13.23 1h-1.46L3.52 9.25l-.16.22L1 13.59 2.41 15l4.12-2.36.22-.16L15 4.23V2.77L13.23 1zM13 4l-7 7L5 10l7-7 1 1z" />
              </svg>
              <span>{morphLabel}</span>
            </button>
          </div>
        </div>

        <footer className={styles.foot}>
          <button type="button" className={[styles.btn, styles.ghost].join(' ')} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={[styles.btn, styles.accent].join(' ')}
            onClick={() => onPost(body.trim())}
            disabled={body.trim().length === 0}
          >
            Post annotation
          </button>
        </footer>
      </div>
    </div>
  );
}
