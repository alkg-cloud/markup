'use client';

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Form from '@radix-ui/react-form';
import { forwardRef, type ReactNode, useEffect, useImperativeHandle, useRef } from 'react';
import { Kbd } from '@/components/Kbd/Kbd';
import {
  BODY_CHAR_LIMIT,
  type BodyState,
  type Draft,
  type DraftStatus,
  deriveBodyState,
  derivePinCount,
  type PinCount,
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

/**
 * Locale-independent thousands separator. DS 32 specifies `10 000` with a
 * thin (non-breaking) space; `toLocaleString()` swaps in `,` / `.` / ` `
 * per the browser locale, drifting the counter from the contract.
 */
function formatCount(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function pinHintCopy(count: number, pinCount: PinCount): string {
  if (pinCount === 'max') return '· max reached';
  if (count === 0) return '· click on the mockup to add';
  return '· click pin to remove';
}

/**
 * AlertDialog body copy. Branches over (bodyLength, pinCount) so the
 * "lose 0 pins" awkwardness is suppressed when only one side is non-empty.
 * The four branches mirror the four reachable cancel states — Cancel is
 * disabled on an empty draft, so (0, 0) doesn't surface in practice.
 */
function discardCopy(bodyLen: number, pinCount: number): ReactNode {
  const pins = (
    <strong>
      {pinCount} {pinCount === 1 ? 'pin' : 'pins'}
    </strong>
  );
  if (bodyLen > 0 && pinCount > 0) {
    return <>You'll lose {pins} and the text you typed. This can't be undone.</>;
  }
  if (bodyLen > 0) {
    return <>You'll lose the text you typed. This can't be undone.</>;
  }
  if (pinCount > 0) {
    return <>You'll lose {pins}. This can't be undone.</>;
  }
  return <>You'll lose this draft. This can't be undone.</>;
}

export const DraftCard = forwardRef<HTMLTextAreaElement, DraftCardProps>(
  function DraftCard(props, forwardedRef) {
    const { draft, status, density = 'compact', onBodyChange, onCancel, onSave, onSend } = props;

    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    useImperativeHandle(forwardedRef, () => internalRef.current as HTMLTextAreaElement, []);

    // Focus the textarea on mount — replaces the autoFocus attribute (which
    // biome flags via lint/a11y/noAutofocus). UX is identical: the DraftCard
    // mount is itself a user-triggered action (+ button, N shortcut, or
    // restore from localStorage), so initial focus is appropriate.
    useEffect(() => {
      internalRef.current?.focus();
    }, []);

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
              {formatCount(draft.body.length)} / {formatCount(BODY_CHAR_LIMIT)}
            </span>
          )}
        </div>

        <Form.Field name="body">
          <Form.Label className="sr-only">Annotation body</Form.Label>
          <Form.Control asChild>
            <textarea
              ref={internalRef}
              className={styles.textarea}
              value={draft.body}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder="What's wrong here? What would you change?"
              required
              maxLength={BODY_CHAR_LIMIT}
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
                  <AlertDialog.Title className={styles.alertTitle}>
                    Discard draft?
                  </AlertDialog.Title>
                  <AlertDialog.Description className={styles.alertBody}>
                    {discardCopy(draft.body.length, draft.pins.length)}
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
            <Kbd keys={['mod', 's']} className={styles.kbdInBtn} />
          </button>

          <Form.Submit asChild>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={bodyState !== 'typing' || status === 'sending'}
            >
              {sendLabel(status)}
              <Kbd keys={['mod', 'enter']} className={styles.kbdInBtn} />
            </button>
          </Form.Submit>
        </div>

        <div className={styles.status} role="status" aria-live="polite">
          <span className={styles.statusDot} />
          <span>{statusCopy(status, draft.body, draft.lastSavedAt)}</span>
        </div>
      </Form.Root>
    );
  },
);
