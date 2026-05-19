/**
 * Names that appear as URL path segments (projects, folders, mockups)
 * must be URL-safe and human-readable: latin letters, digits, hyphens,
 * and underscores only.
 *
 * The same rule applies on create AND rename — the source of truth is
 * here; UI inputs surface the error message inline, server-side
 * handlers validate again before persisting.
 */
export const URL_SAFE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
const FORBIDDEN_CHAR_PATTERN = /[^A-Za-z0-9_-]/;

export const URL_SAFE_NAME_HINT =
  'Use only letters (a–z, A–Z), digits, hyphens (-), or underscores (_).';

export interface UrlSafeNameError {
  /** Single character that violated the rule, if pinpointable. */
  offendingChar?: string;
  message: string;
}

/**
 * Returns `null` when `value` is a valid URL-safe name; otherwise
 * returns an error object whose `message` is ready to render directly.
 * Empty strings return `null` so callers can treat the rule as
 * orthogonal to required-ness.
 */
export function validateUrlSafeName(value: string): UrlSafeNameError | null {
  if (value.length === 0) return null;
  const match = FORBIDDEN_CHAR_PATTERN.exec(value);
  if (!match) return null;
  const offendingChar = match[0];
  return {
    offendingChar,
    message: `"${offendingChar}" is not allowed. ${URL_SAFE_NAME_HINT}`,
  };
}
