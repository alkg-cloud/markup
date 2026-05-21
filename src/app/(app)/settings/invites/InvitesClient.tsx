'use client';

import * as Form from '@radix-ui/react-form';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  VscAdd,
  VscCheck,
  VscCircleSlash,
  VscClose,
  VscKebabVertical,
  VscMail,
  VscTrash,
  VscWarning,
} from 'react-icons/vsc';
import { AppMain } from '@/components/AppMain/AppMain';
import { useConfirm } from '@/components/ConfirmDialog';
import { CopyButton, useCopy } from '@/components/CopyButton';
import { RadixDialog } from '@/components/Dialog/RadixDialog';
import { InputField } from '@/components/InputField';
import { usePopover } from '@/lib/popover/usePopover';
import styles from './InvitesClient.module.css';

export interface InviteRow {
  id: string;
  email: string | null;
  role: 'admin' | 'member';
  status: 'unused' | 'used' | 'expired' | 'revoked' | 'disabled';
  createdAt: string;
  expiresAt: string | null;
  usedAt: string | null;
  usedByEmail: string | null;
  revokedAt: string | null;
  lastFour: string;
}

type ExpiryOpt = '24h' | '7d' | '30d' | 'never';
type RoleOpt = 'admin' | 'member';

const ONBOARDING_KEY = 'markup.invites.onboarding-dismissed';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- helpers ---------------------------------------------------------------

function relTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const past = diffMs >= 0;
  const abs = Math.abs(diffMs);
  const sec = Math.floor(abs / 1000);
  if (sec < 60) return past ? 'just now' : 'in a moment';
  const min = Math.floor(sec / 60);
  if (min < 60) return past ? `${min}m ago` : `in ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return past ? `${hr}h ago` : `in ${hr}h`;
  const days = Math.floor(hr / 24);
  if (days === 1) return past ? 'yesterday' : 'tomorrow';
  if (days < 30) return past ? `${days}d ago` : `in ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return past ? `${months}mo ago` : `in ${months}mo`;
  return past ? `${Math.floor(months / 12)}y ago` : `in ${Math.floor(months / 12)}y`;
}

function expiresInChunk(expiresAt: string | null): string {
  if (!expiresAt) return 'Never expires';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin - days * 60 * 24) / 60);
  if (days >= 1 && hours >= 1) return `Expires in ${days}d ${hours}h`;
  if (days >= 1) return `Expires in ${days}d`;
  if (hours >= 1) return `Expires in ${hours}h`;
  return `Expires in <1h`;
}

function inviteTitle(row: InviteRow): string {
  return row.email ? `Invite for ${row.email}` : 'Open invite';
}

function metaStateChunk(row: InviteRow): string {
  switch (row.status) {
    case 'unused':
      return expiresInChunk(row.expiresAt);
    case 'used': {
      const when = row.usedAt ? relTime(row.usedAt) : 'previously';
      return row.usedByEmail ? `Used ${when} by ${row.usedByEmail}` : `Used ${when}`;
    }
    case 'expired':
      return row.expiresAt ? `Expired ${relTime(row.expiresAt)}` : 'Expired';
    case 'revoked':
      return row.revokedAt ? `Revoked ${relTime(row.revokedAt)}` : 'Revoked';
    case 'disabled':
      return row.revokedAt
        ? `Disabled ${relTime(row.revokedAt)} (suspicious activity)`
        : 'Disabled (suspicious activity)';
  }
}

function expiryHint(expiry: ExpiryOpt): string {
  if (expiry === 'never') return 'Link lives until you revoke it.';
  const now = Date.now();
  const ms =
    expiry === '24h' ? 24 * 3600_000 : expiry === '7d' ? 7 * 24 * 3600_000 : 30 * 24 * 3600_000;
  const d = new Date(now + ms);
  // Mon DD, h:mm AM/PM — matches DS 22 helper text.
  const fmt = d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `Link dies on ${fmt}.`;
}

function roleHint(role: RoleOpt): string {
  return role === 'member'
    ? 'Can view projects and comment. No settings access.'
    : 'Full access, including creating new invites and tokens.';
}

// --- icons -----------------------------------------------------------------
// Most glyphs come from `react-icons/vsc` (imported at the top of the file).
// MemberIcon and AdminIcon stay inline because the closest VSCode codicons
// (`VscAccount`, `VscShield`) diverge meaningfully from the DS pair: the inline
// MemberIcon is a tight bust silhouette (VscAccount is a much more detailed
// account portrait) and the inline AdminIcon is a shield with a checkmark
// inside (VscShield draws a question-mark shape inside the shield).
//
// Revoke (unused → revoked) uses `VscCircleSlash`, NOT trash, because the row
// stays in the list as a revoked entry. Trash is reserved for the terminal-
// state Delete affordance that actually removes the row.

// custom: shield-with-check has no react-icons/vsc equivalent (VscShield draws
// a question-mark inside the shield).
function AdminIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0L2 2v4.5C2 10.36 4.56 13.97 8 15c3.44-1.03 6-4.64 6-8.5V2L8 0zm-.5 11l-3-3 .707-.707L7.5 9.586l3.293-3.293.707.707-4 4z" />
    </svg>
  );
}
// custom: simple bust silhouette to pair visually with AdminIcon; VscAccount
// is a much more detailed portrait that doesn't sit well at 12px next to the
// inline shield.
function MemberIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM5.5 3.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0zM3 16h10v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1z" />
    </svg>
  );
}

// --- card icon by status ---------------------------------------------------

function CardStateIcon({ status }: { status: InviteRow['status'] }) {
  if (status === 'used') return <VscCheck size={16} aria-hidden="true" />;
  if (status === 'expired' || status === 'revoked' || status === 'disabled')
    return <VscWarning size={16} aria-hidden="true" />;
  return <VscMail size={16} aria-hidden="true" />;
}

// --- New Invite dialog -----------------------------------------------------

interface NewInviteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (opts: {
    email: string | null;
    role: RoleOpt;
    expiry: ExpiryOpt;
  }) => Promise<{ error?: string } | null>;
}

function NewInviteDialog({ open, onClose, onSubmit }: NewInviteDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleOpt>('member');
  const [expiry, setExpiry] = useState<ExpiryOpt>('7d');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset when reopened.
  useEffect(() => {
    if (open) {
      setEmail('');
      setRole('member');
      setExpiry('7d');
      setEmailError(null);
      setBusy(false);
    }
  }, [open]);

  async function handleSubmit() {
    const trimmed = email.trim();
    if (trimmed && !EMAIL_RE.test(trimmed)) {
      setEmailError('Please enter a valid email or leave empty.');
      return;
    }
    setEmailError(null);
    setBusy(true);
    const result = await onSubmit({
      email: trimmed || null,
      role,
      expiry,
    });
    setBusy(false);
    if (result?.error) {
      setEmailError('Something went wrong. Please try again.');
    }
  }

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSubmit();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  return (
    <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay />
        <RadixDialog.Content aria-describedby={undefined}>
          <RadixDialog.Title>Create invite</RadixDialog.Title>

          <Form.Root className={styles.dialogForm} onSubmit={handleFormSubmit}>
            <InputField.Root name="email" data-state={emailError ? 'error' : undefined}>
              <InputField.Label>Bind to email (optional)</InputField.Label>
              <InputField.Control asChild>
                {/* RadixDialog auto-focuses the first focusable element
                    on open, so no `autoFocus` (also forbidden by Biome). */}
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </InputField.Control>
              {emailError ? (
                <InputField.Message forceMatch>{emailError}</InputField.Message>
              ) : (
                <InputField.Help>If set, signup requires this exact email.</InputField.Help>
              )}
            </InputField.Root>

            <div className={styles.dialogField}>
              <span className={styles.dialogLabel}>Role</span>
              <div className={`${styles.segmented} ${styles.cols2}`}>
                <button
                  type="button"
                  className={`${styles.seg} ${role === 'member' ? styles.segActive : ''}`}
                  onClick={() => setRole('member')}
                >
                  <MemberIcon />
                  Member
                </button>
                <button
                  type="button"
                  className={`${styles.seg} ${role === 'admin' ? styles.segActive : ''}`}
                  onClick={() => setRole('admin')}
                >
                  <AdminIcon />
                  Admin
                </button>
              </div>
              <span className={styles.dialogHint}>{roleHint(role)}</span>
            </div>

            <div className={styles.dialogField}>
              <span className={styles.dialogLabel}>Expires in</span>
              <div className={`${styles.segmented} ${styles.cols4}`}>
                {(['24h', '7d', '30d', 'never'] as ExpiryOpt[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`${styles.seg} ${expiry === opt ? styles.segActive : ''}`}
                    onClick={() => setExpiry(opt)}
                  >
                    {opt === 'never' ? 'Never' : opt}
                  </button>
                ))}
              </div>
              <span className={styles.dialogHint}>{expiryHint(expiry)}</span>
            </div>

            <div className={styles.dialogActions}>
              <RadixDialog.Close asChild>
                <button type="button" className={styles.dialogBtnSecondary} disabled={busy}>
                  Cancel
                </button>
              </RadixDialog.Close>
              <Form.Submit asChild>
                <button type="submit" className={styles.dialogBtnAccent} disabled={busy}>
                  {busy ? 'Creating…' : 'Create invite'}
                </button>
              </Form.Submit>
            </div>
          </Form.Root>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

// --- main client -----------------------------------------------------------

export function InvitesClient({ initialInvites }: { initialInvites: InviteRow[] }) {
  const [invites, setInvites] = useState<InviteRow[]>(initialInvites);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  // Plaintext tokens minted in this page session. Once the page reloads
  // we have no way to recover the plaintext — the server only stores a
  // SHA-256 hash. That's the same security posture as AgentToken: a token
  // is only ever shown to the admin once, immediately after creation.
  const [plaintextByInviteId, setPlaintextByInviteId] = useState<Record<string, string>>({});
  const [showDialog, setShowDialog] = useState(false);
  const bulkMenu = usePopover<HTMLButtonElement, HTMLDivElement>('right');
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { copy: copyLink } = useCopy({ message: 'Invite link copied to clipboard' });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOnboardingDismissed(localStorage.getItem(ONBOARDING_KEY) === 'true');
  }, []);

  const unusedCount = useMemo(() => invites.filter((i) => i.status === 'unused').length, [invites]);
  const historyCount = useMemo(
    () => invites.filter((i) => i.status !== 'unused').length,
    [invites],
  );

  const refresh = useCallback(async () => {
    const r = await fetch('/api/invites');
    if (!r.ok) return;
    const body = await r.json();
    setInvites(body.invites);
  }, []);

  async function onRevokeOne(invite: InviteRow) {
    const ok = await confirm({
      title: 'Revoke invite',
      description: "Anyone with this link won't be able to sign up. This action can't be undone.",
      confirmLabel: 'Revoke invite',
      danger: true,
    });
    if (!ok) return;
    await fetch(`/api/invites/${invite.id}`, { method: 'DELETE' });
    await refresh();
  }

  async function onDeleteOne(invite: InviteRow) {
    await fetch(`/api/invites/${invite.id}`, { method: 'DELETE' });
    await refresh();
  }

  async function onRevokeAll() {
    bulkMenu.close();
    if (unusedCount === 0) return;
    const ok = await confirm({
      title: 'Revoke all open invites',
      description: `Revoke all ${unusedCount} open invites? Anyone with one of those links won't be able to sign up. This action can't be undone.`,
      confirmLabel: 'Revoke all',
      danger: true,
    });
    if (!ok) return;
    await fetch('/api/invites/revoke-all', { method: 'POST' });
    await refresh();
  }

  async function onClearHistory() {
    bulkMenu.close();
    if (historyCount === 0) return;
    const ok = await confirm({
      title: 'Clear all history',
      description: `Clear ${historyCount} completed invites from the list? This removes the historical record. People who already signed up keep their accounts.`,
      confirmLabel: 'Clear history',
      danger: true,
    });
    if (!ok) return;
    await fetch('/api/invites/history', { method: 'DELETE' });
    await refresh();
  }

  async function onCreate(opts: {
    email: string | null;
    role: RoleOpt;
    expiry: ExpiryOpt;
  }): Promise<{ error?: string } | null> {
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(opts),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body?.error ?? 'unknown_error' };
    }
    const created = await res.json();
    setPlaintextByInviteId((prev) => ({ ...prev, [created.id]: created.plaintext }));
    const link = `${window.location.origin}/invite/${created.plaintext}`;
    await copyLink(link);
    setShowDialog(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingDismissed(true);
    await refresh();
    return null;
  }

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingDismissed(true);
  }

  // Sort: unused first (newest first), terminal next (newest first).
  const sorted = useMemo(() => {
    const open = invites
      .filter((i) => i.status === 'unused')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const terminal = invites
      .filter((i) => i.status !== 'unused')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return [...open, ...terminal];
  }, [invites]);

  const total = invites.length;
  const countLabel = `${total} ${total === 1 ? 'invite' : 'invites'}`;
  const showOnboarding = total === 0 && !onboardingDismissed;
  const showTerse = total === 0 && onboardingDismissed;

  return (
    <AppMain variant="centered" className={styles.page} ariaLabel="Invites settings">
      {confirmDialog}

      <h1 className={styles.pageTitle}>Invites</h1>
      <p className={styles.pageSubtitle}>Generate invite links for new teammates.</p>

      <div className={styles.listHeader}>
        <span className={styles.count}>{countLabel}</span>
        <div className={styles.headerActions}>
          <button type="button" className={styles.btnAction} onClick={() => setShowDialog(true)}>
            <VscAdd size={14} aria-hidden="true" />
            New Invite
          </button>
          <button
            ref={bulkMenu.triggerRef}
            type="button"
            className={styles.kebabBtn}
            data-tooltip="Bulk actions"
            data-tooltip-align="right"
            aria-label="Bulk actions"
            aria-haspopup="menu"
            {...bulkMenu.triggerProps}
          >
            <VscKebabVertical size={14} aria-hidden="true" />
          </button>
          <div {...bulkMenu.popoverProps} className={styles.kebabMenu} role="menu">
            <button
              type="button"
              role="menuitem"
              className={`${styles.kebabItem} ${unusedCount === 0 ? styles.kebabItemDisabled : ''}`}
              disabled={unusedCount === 0}
              onClick={onRevokeAll}
            >
              <VscCircleSlash size={14} aria-hidden="true" />
              Revoke all open invites
              <span className={styles.countChip}>{unusedCount}</span>
            </button>
            <div className={styles.kebabDivider} />
            <button
              type="button"
              role="menuitem"
              className={`${styles.kebabItem} ${historyCount === 0 ? styles.kebabItemDisabled : ''}`}
              disabled={historyCount === 0}
              onClick={onClearHistory}
            >
              <VscTrash size={14} aria-hidden="true" />
              Clear all history
              <span className={styles.countChip}>{historyCount}</span>
            </button>
          </div>
        </div>
      </div>

      {showOnboarding && (
        <div className={styles.emptyOnboarding}>
          <button
            type="button"
            className={styles.emptyOnboardingDismiss}
            data-tooltip="Dismiss"
            aria-label="Dismiss onboarding"
            onClick={dismissOnboarding}
          >
            <VscClose size={14} aria-hidden="true" />
          </button>
          <div className={styles.emptyOnboardingEyebrow}>Getting started</div>
          <div className={styles.emptyOnboardingTitle}>Onboard your first teammate</div>
          <div className={styles.emptyOnboardingSteps}>
            <div className={styles.emptyOnboardingStep}>
              <span className={styles.emptyOnboardingStepnum}>1</span>
              <span>
                Click <strong className={styles.emptyOnboardingStrong}>New Invite</strong> in the
                header.
              </span>
            </div>
            <div className={styles.emptyOnboardingStep}>
              <span className={styles.emptyOnboardingStepnum}>2</span>
              <span>Pick a role, expiry, and optionally bind to an email.</span>
            </div>
            <div className={styles.emptyOnboardingStep}>
              <span className={styles.emptyOnboardingStepnum}>3</span>
              <span>Copy the link and send it to your teammate.</span>
            </div>
          </div>
          <button type="button" className={styles.btnAction} onClick={() => setShowDialog(true)}>
            <VscAdd size={14} aria-hidden="true" />
            Create your first invite
          </button>
        </div>
      )}

      {showTerse && (
        <div className={styles.emptyTerse}>
          <div className={styles.emptyTerseIcon}>
            <VscMail size={22} aria-hidden="true" />
          </div>
          <div className={styles.emptyTerseTitle}>No invites yet</div>
          <div className={styles.emptyTerseLine}>Generate a link to invite a teammate.</div>
        </div>
      )}

      {total > 0 && (
        <div className={styles.list}>
          {sorted.map((row) => {
            const terminal = row.status !== 'unused';
            const stateClass =
              row.status === 'used'
                ? styles.isStateUsed
                : row.status === 'expired'
                  ? styles.isStateExpired
                  : row.status === 'revoked'
                    ? styles.isStateRevoked
                    : row.status === 'disabled'
                      ? styles.isStateDisabled
                      : styles.isStateUnused;
            const hasPlaintext = !!plaintextByInviteId[row.id];
            return (
              <div
                key={row.id}
                className={`${styles.card} ${stateClass} ${terminal ? styles.isTerminal : ''}`}
              >
                <div className={styles.cardIcon}>
                  <CardStateIcon status={row.status} />
                </div>
                <div className={styles.cardInfo}>
                  <div className={styles.cardTitle}>{inviteTitle(row)}</div>
                  <div className={styles.cardMeta}>
                    <span>Created {relTime(row.createdAt)}</span>
                    <span className={styles.sep}>·</span>
                    <span>{row.role === 'admin' ? 'Admin' : 'Member'}</span>
                    <span className={styles.sep}>·</span>
                    <span className={styles.metaState}>{metaStateChunk(row)}</span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  {!terminal && (
                    <>
                      <CopyButton
                        variant="icon"
                        ariaLabel="Copy invite link"
                        data-tooltip={
                          hasPlaintext
                            ? 'Copy link'
                            : 'Copy unavailable — only available right after creation'
                        }
                        data-tooltip-align="right"
                        disabled={!hasPlaintext}
                        value={
                          hasPlaintext
                            ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${plaintextByInviteId[row.id]}`
                            : ''
                        }
                        message="Invite link copied"
                      />
                      <button
                        type="button"
                        className={`${styles.cardAction} ${styles.danger}`}
                        data-tooltip="Revoke"
                        data-tooltip-align="right"
                        aria-label="Revoke invite"
                        onClick={() => onRevokeOne(row)}
                      >
                        <VscCircleSlash size={14} aria-hidden="true" />
                      </button>
                    </>
                  )}
                  {terminal && (
                    <button
                      type="button"
                      className={`${styles.cardAction} ${styles.cardActionTerminalOnly} ${styles.danger}`}
                      data-tooltip="Remove from list"
                      data-tooltip-align="right"
                      aria-label="Delete invite"
                      onClick={() => onDeleteOne(row)}
                    >
                      <VscTrash size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewInviteDialog open={showDialog} onClose={() => setShowDialog(false)} onSubmit={onCreate} />
    </AppMain>
  );
}
