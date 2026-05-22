'use client';

import { forwardRef } from 'react';
import * as Form from '@radix-ui/react-form';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Kbd } from '@/components/Kbd/Kbd';
import {
  type Draft,
  type DraftStatus,
  type BodyState,
  type PinCount,
  BODY_CHAR_LIMIT,
  deriveBodyState,
  derivePinCount,
} from '@/components/MockupViewer/draft-types';
import styles from './DraftCard.module.css';

export interface DraftCardProps {
  draft: Draft;
  status: DraftStatus;
  density?: 'compact' | 'comfortable';
  onBodyChange: (body: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onSend: () => void;
}

function statusCopy(status: DraftStatus, body: string, lastSavedAt: number | null): string {
  switch (status) {
    case 'unsaved':
      return body.length === 0 ? 'Type to start' : 'Unsaved changes';
    case 'saving':
      return 'Saving…';
    case 'saved':
      return lastSavedAt ? formatAgo(lastSavedAt) : 'Draft saved';
    case 'sending':
      return 'Sending…';
    case 'error':
      return "Couldn't send · saved locally";
  }
}

function formatAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.round(diff / 1000);
  if (s < 60) return `Draft saved ${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `Draft saved ${m} m ago`;
  const h = Math.round(m / 60);
  return `Draft saved ${h} h ago`;
}

function sendLabel(status: DraftStatus): string {
  if (status === 'sending') return 'Sending…';
  if (status === 'error') return 'Retry';
  return 'Send';
}

function pinHintCopy(count: number, pinCount: PinCount): string {
  if (pinCount === 'max') return '· max reached';
  if (count === 0) return '· click on the mockup to add';
  return '· click pin to remove';
}

export const DraftCard = forwardRef<HTMLTextAreaElement, DraftCardProps>(function DraftCard(
  props,
  textareaRef,
) {
  const { draft, status, density = 'compact', onBodyChange, onCancel, onSave, onSend } = props;

  const bodyState: BodyState = deriveBodyState(draft.body);
  const pinCount: PinCount = derivePinCount(draft.pins.length);
  const hasContent = draft.body.length > 0 || draft.pins.length > 0;

  return (
    <Form.Root
      className={styles.root}
      data-draft-card-root=""
      data-status={status}
      data-body-state={bodyState}
      data-pin-count={pinCount}
      data-density={density}
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
    >
      <div className={styles.header}>
        <span className={styles.marker}>Draft</span>
        <span className={styles.spacer} />
        {bodyState !== 'empty' && (
          <span className={styles.countChars}>
            {draft.body.length.toLocaleString()} / {BODY_CHAR_LIMIT.toLocaleString()}
          </span>
        )}
      </div>

      <Form.Field name="body">
        <Form.Label className="sr-only">Annotation body</Form.Label>
        <Form.Control asChild>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={draft.body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder="What's wrong here? What would you change?"
            required
            maxLength={BODY_CHAR_LIMIT}
            autoFocus
            disabled={status === 'sending'}
          />
        </Form.Control>
      </Form.Field>

      <div className={styles.pinRow}>
        <span className={styles.pinMini} aria-hidden />
        <strong className={styles.pinCount}>
          {draft.pins.length} {draft.pins.length === 1 ? 'pin' : 'pins'}
        </strong>
        <span className={styles.pinHint}>{pinHintCopy(draft.pins.length, pinCount)}</span>
      </div>

      <div className={styles.actions}>
        {hasContent ? (
          <AlertDialog.Root>
            <AlertDialog.Trigger asChild>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                disabled={status === 'sending'}
              >
                Cancel
              </button>
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Overlay className={styles.alertOverlay} />
              <AlertDialog.Content className={styles.alert}>
                <div className={styles.alertIcon}>!</div>
                <AlertDialog.Title className={styles.alertTitle}>Discard draft?</AlertDialog.Title>
                <AlertDialog.Description className={styles.alertBody}>
                  You'll lose{' '}
                  <strong>
                    {draft.pins.length} {draft.pins.length === 1 ? 'pin' : 'pins'}
                  </strong>
                  {draft.body.length > 0 ? ' and the text you typed' : ''}. This can't be undone.
                </AlertDialog.Description>
                <div className={styles.alertActions}>
                  <AlertDialog.Cancel asChild>
                    <button type="button" className={`${styles.btn} ${styles.btnGhost}`}>
                      Keep editing
                    </button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger}`}
                      onClick={onCancel}
                    >
                      Discard
                    </button>
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        ) : (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onCancel}
            disabled={status === 'sending'}
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          disabled={!draft.hasUnsavedChanges || status === 'sending'}
          onClick={onSave}
        >
          Draft
          <Kbd keys={['mod', 's']} />
        </button>

        <Form.Submit asChild>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={bodyState !== 'typing' || status === 'sending'}
          >
            {sendLabel(status)}
            <Kbd keys={['mod', 'enter']} />
          </button>
        </Form.Submit>
      </div>

      <div className={styles.status} role="status" aria-live="polite">
        <span className={styles.statusDot} />
        <span>{statusCopy(status, draft.body, draft.lastSavedAt)}</span>
      </div>
    </Form.Root>
  );
});
