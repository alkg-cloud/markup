import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIMES,
  type AcceptedExtension,
  type AcceptedMime,
  MAX_UPLOAD_BYTES,
} from './constants';

/**
 * Result of `validateFile`. Discriminated by `ok` so callers can
 * narrow without ad-hoc type guards.
 */
export type ValidationResult =
  | { ok: true; file: File }
  | { ok: false; reason: 'empty' | 'multi' | 'wrong-type' | 'too-large' };

/**
 * Pure file validator for mockup uploads.
 *
 * Rejection precedence (checked in this order):
 *  1. `empty`      — zero files
 *  2. `multi`      — more than one file
 *  3. `wrong-type` — neither `.html`/`.zip` extension nor `text/html`/`application/zip` MIME
 *  4. `too-large`  — exceeds {@link MAX_UPLOAD_BYTES}
 *
 * Accepts a `FileList` (DataTransfer / `<input type=file>`) or a plain
 * `File[]` so callers don't need to copy between the two shapes.
 *
 * Type check is permissive: a file passes if EITHER its extension OR
 * its MIME is accepted. Some browsers report `application/octet-stream`
 * for `.html` files dragged in from a file manager, so requiring both
 * would reject legitimate uploads.
 */
export function validateFile(files: FileList | File[]): ValidationResult {
  const count = files.length;
  if (count === 0) return { ok: false, reason: 'empty' };
  if (count > 1) return { ok: false, reason: 'multi' };

  // After the count checks above, exactly one file is present.
  const file = (Array.isArray(files) ? files[0] : files.item(0)) as File;

  if (!isAcceptedType(file)) return { ok: false, reason: 'wrong-type' };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: 'too-large' };

  return { ok: true, file };
}

function isAcceptedType(file: File): boolean {
  return hasAcceptedExtension(file.name) || hasAcceptedMime(file.type);
}

function hasAcceptedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext: AcceptedExtension) => lower.endsWith(ext));
}

function hasAcceptedMime(type: string): boolean {
  if (!type) return false;
  const lower = type.toLowerCase();
  return (ACCEPTED_MIMES as readonly string[]).includes(lower as AcceptedMime);
}
