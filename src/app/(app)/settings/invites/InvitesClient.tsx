'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppMain } from '@/components/AppMain/AppMain';
import { useConfirm } from '@/components/ConfirmDialog';
import { Dialog, DialogButton, DialogField, DialogInput } from '@/components/Dialog/Dialog';
import { useToast } from '@/components/Toast/Toast';
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

// --- icons (inlined from DS 21 + DS 22) -----------------------------------

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z" />
    </svg>
  );
}
function KebabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0-4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
    </svg>
  );
}
function EnvelopeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M1.5 3l-.5.5v9l.5.5h13l.5-.5v-9l-.5-.5h-13zM2 4.21l5.65 4.06.59-.01L14 4.21V12H2V4.21zM13.07 4H2.93L8 7.65 13.07 4z" />
    </svg>
  );
}
function EnvelopeLarge() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M1.5 3l-.5.5v9l.5.5h13l.5-.5v-9l-.5-.5h-13zM2 4.21l5.65 4.06.59-.01L14 4.21V12H2V4.21zM13.07 4H2.93L8 7.65 13.07 4z" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24L13.668 2.681l.763.642z" />
    </svg>
  );
}
function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.56 1h.88l6.54 12.26-.44.74H1.44L1 13.26 7.56 1zM8 2.28L2.28 13H13.7L8 2.28zM8.625 12v-1h-1.25v1h1.25zm-1.25-2V6h1.25v4h-1.25z"
      />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 4l1-1h5.414L14 6.586V14l-1 1H5l-1-1V4zm9 3l-3-3H5v10h8V7z"
      />
      <path fillRule="evenodd" clipRule="evenodd" d="M3 1L2 2v10l1 1V2h6.414l-1-1H3z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M10 6H9V12H10V6Z" />
      <path d="M7 6H6V12H7V6Z" />
      <path d="M13 3H11V2C11 1.73478 10.8947 1.48038 10.7072 1.29285C10.5196 1.10531 10.2652 1 10 1L6 1C5.73478 1 5.48038 1.10531 5.29285 1.29285C5.10531 1.48038 5 1.73478 5 2V3H2V4H3V14L4 15H12L13 14V4H14V3H13ZM6 2H10V3H6V2ZM12 14H4V4H12V14Z" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" />
    </svg>
  );
}
function MemberIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM5.5 3.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0zM3 16h10v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1z" />
    </svg>
  );
}
function AdminIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0L2 2v4.5C2 10.36 4.56 13.97 8 15c3.44-1.03 6-4.64 6-8.5V2L8 0zm-.5 11l-3-3 .707-.707L7.5 9.586l3.293-3.293.707.707-4 4z" />
    </svg>
  );
}

// --- card icon by status ---------------------------------------------------

function CardStateIcon({ status }: { status: InviteRow['status'] }) {
  if (status === 'used') return <CheckIcon />;
  if (status === 'expired' || status === 'revoked' || status === 'disabled') return <WarningIcon />;
  return <EnvelopeIcon />;
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create invite"
      actions={
        <>
          <DialogButton variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </DialogButton>
          <DialogButton variant="accent" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Creating…' : 'Create invite'}
          </DialogButton>
        </>
      }
    >
      <DialogField
        label="Bind to email (optional)"
        hint="If set, signup requires this exact email."
        error={emailError}
      >
        <DialogInput
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          autoFocus
        />
      </DialogField>

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
    </Dialog>
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
  const toast = useToast();

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
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* clipboard unavailable — still show toast since the card exposes the
         Copy button as a fallback for this page session. */
    }
    setShowDialog(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingDismissed(true);
    toast.show('Invite link copied to clipboard');
    await refresh();
    return null;
  }

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingDismissed(true);
  }

  async function copyExisting(invite: InviteRow) {
    const plaintext = plaintextByInviteId[invite.id];
    if (!plaintext) return;
    const link = `${window.location.origin}/invite/${plaintext}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.show('Invite link copied');
    } catch {
      /* clipboard unavailable; silently no-op. */
    }
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
            <PlusIcon />
            New Invite
          </button>
          <button
            ref={bulkMenu.triggerRef}
            type="button"
            className={styles.kebabBtn}
            title="Bulk actions"
            aria-label="Bulk actions"
            aria-haspopup="menu"
            {...bulkMenu.triggerProps}
          >
            <KebabIcon />
          </button>
          <div {...bulkMenu.popoverProps} className={styles.kebabMenu} role="menu">
            <button
              type="button"
              role="menuitem"
              className={`${styles.kebabItem} ${unusedCount === 0 ? styles.kebabItemDisabled : ''}`}
              disabled={unusedCount === 0}
              onClick={onRevokeAll}
            >
              <WarningIcon />
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
              <TrashIcon />
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
            title="Dismiss"
            aria-label="Dismiss onboarding"
            onClick={dismissOnboarding}
          >
            <CloseIcon />
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
            <PlusIcon />
            Create your first invite
          </button>
        </div>
      )}

      {showTerse && (
        <div className={styles.emptyTerse}>
          <div className={styles.emptyTerseIcon}>
            <EnvelopeLarge />
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
                      <button
                        type="button"
                        className={styles.cardAction}
                        title={
                          hasPlaintext
                            ? 'Copy link'
                            : 'Copy unavailable — only available right after creation'
                        }
                        aria-label="Copy invite link"
                        disabled={!hasPlaintext}
                        onClick={() => copyExisting(row)}
                      >
                        <CopyIcon />
                      </button>
                      <button
                        type="button"
                        className={`${styles.cardAction} ${styles.danger}`}
                        title="Revoke"
                        aria-label="Revoke invite"
                        onClick={() => onRevokeOne(row)}
                      >
                        <TrashIcon />
                      </button>
                    </>
                  )}
                  {terminal && (
                    <button
                      type="button"
                      className={`${styles.cardAction} ${styles.cardActionTerminalOnly} ${styles.danger}`}
                      title="Remove from list"
                      aria-label="Delete invite"
                      onClick={() => onDeleteOne(row)}
                    >
                      <TrashIcon />
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
