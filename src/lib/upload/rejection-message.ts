import type { ValidationResult } from './validate-file';

/**
 * Maps a {@link validateFile} rejection reason to user-visible toast copy.
 *
 * Returns `null` for the `empty` case so callers can do
 * `if (msg) show(msg)` — `empty` means the user cancelled the picker (or
 * dropped nothing), and a toast in that case would be noise.
 *
 * Centralised so every upload surface (`UploadEmptyState`,
 * `ProjectSidebar` footer button, `NewMockupDialogProvider`'s drop
 * handler) reads from the same copy and stays in sync. Strings are
 * locked to plan §Task 13 — change them here and every surface picks up
 * the new copy in one place.
 */
export type RejectionReason = Exclude<ValidationResult, { ok: true }>['reason'];

export function rejectionMessage(reason: RejectionReason): string | null {
  switch (reason) {
    case 'multi':
      return 'Drop one file at a time.';
    case 'wrong-type':
      return 'Only HTML or ZIP files are supported.';
    case 'too-large':
      return 'File too large (limit 10 MB).';
    case 'empty':
      return null;
  }
}
