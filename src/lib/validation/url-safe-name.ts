import { z } from 'zod';

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

/** Maximum character length for any URL-safe name (project, folder, mockup). */
export const NAME_MAX_LENGTH = 64;

/**
 * Names at or above this length trigger the character counter in the UI
 * so users get advance notice before hitting the cap.
 * Value: NAME_MAX_LENGTH - 8 = 56.
 */
export const NAME_LENGTH_WARN_THRESHOLD = NAME_MAX_LENGTH - 8;

const URL_SAFE_NAME_HINT = 'Use only letters, digits, hyphens, or underscores.';

type UrlSafeNameErrorCode = 'name_required' | 'name_too_long' | 'name_not_url_safe';

export interface UrlSafeNameError {
  /** Discriminated error code — matches the API response `error` field. */
  code: UrlSafeNameErrorCode;
  /** Single character that violated the alphabet rule, if pinpointable. */
  offendingChar?: string;
  /** Ready-to-render copy for inline display. */
  message: string;
}

/**
 * Returns `null` when `value` is a valid URL-safe name; otherwise
 * returns an error object whose `message` is ready to render directly.
 * Empty strings return a `name_required` error (non-empty names are the
 * only legal values). Callers that handle empty separately can test
 * `value.length === 0` before calling.
 */
export function validateUrlSafeName(value: string): UrlSafeNameError | null {
  if (value.length === 0) return { code: 'name_required', message: 'A name is required.' };
  if (value.length > NAME_MAX_LENGTH)
    return {
      code: 'name_too_long',
      message: `Name is too long (max ${NAME_MAX_LENGTH} characters).`,
    };
  const match = FORBIDDEN_CHAR_PATTERN.exec(value);
  if (!match) return null;
  const offendingChar = match[0];
  return {
    code: 'name_not_url_safe',
    offendingChar,
    message: `"${offendingChar}" is not allowed. ${URL_SAFE_NAME_HINT}`,
  };
}

/**
 * Zod schema for any API route accepting a URL-safe name.
 * Uses the shared NAME_MAX_LENGTH cap so all four name-validating
 * routes (project create/update, folder create/update, mockup
 * create/update) share one source of truth.
 *
 * Each Zod message maps directly to an API-level error code that the
 * client can use for precise field-level feedback.
 */
export function urlSafeNameSchema() {
  return z
    .string()
    .min(1, 'name_required')
    .max(NAME_MAX_LENGTH, 'name_too_long')
    .regex(URL_SAFE_NAME_PATTERN, 'name_not_url_safe');
}
