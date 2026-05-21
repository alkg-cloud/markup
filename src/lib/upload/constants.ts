/**
 * Shared upload constants for the New-Mockup dialog + drag-drop flow.
 *
 * Client-side cap used by the dropzone preflight, the dialog form
 * validator, and the toast that surfaces a rejected file. The server is
 * the source of truth for the actual ceiling — see `env().MAX_UPLOAD_MB`
 * in `src/lib/env.ts`, which the route guards in `POST /api/mockups` and
 * `POST /api/mockups/[id]/version` read at request time, and which the
 * zip-extractor's `maxTotalBytes` also derives from.
 *
 * Next.js does not expose non-`NEXT_PUBLIC_` env vars to the browser, so
 * the client cap is a hardcoded mirror of the agreed server default
 * (10 MB). Bumping the server cap requires updating this constant in the
 * same change-set to keep the preflight honest. The endpoint behaviour
 * is documented in `docs/agent-loop/uploads.md`.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = ['.html', '.zip'] as const;
export const ACCEPTED_MIMES = ['text/html', 'application/zip'] as const;

export type AcceptedExtension = (typeof ACCEPTED_EXTENSIONS)[number];
export type AcceptedMime = (typeof ACCEPTED_MIMES)[number];
