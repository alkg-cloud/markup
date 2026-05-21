/**
 * Shared upload constants for the New-Mockup dialog + drag-drop flow.
 *
 * The 10 MB cap mirrors the server-side guard in `POST /api/mockups`
 * (see `docs/agent-loop/uploads.md`). Single source of truth so the
 * client toast / dropzone hint / dialog validation all agree with
 * what the API will actually accept.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = ['.html', '.zip'] as const;
export const ACCEPTED_MIMES = ['text/html', 'application/zip'] as const;

export type AcceptedExtension = (typeof ACCEPTED_EXTENSIONS)[number];
export type AcceptedMime = (typeof ACCEPTED_MIMES)[number];
