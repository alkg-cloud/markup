'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_UPLOAD_BYTES } from '@/lib/upload/constants';

/**
 * Imperative upload API consumed by `NewMockupDialog` (and any future
 * single-file upload surface). Wraps `XMLHttpRequest` so the dialog can
 * report determinate progress — `fetch()` doesn't expose upload progress
 * events, so XHR is the only path.
 *
 * The hook owns nothing but its own state and a ref to the in-flight
 * XHR. URL navigation after success is the caller's responsibility
 * (the success payload is the raw `POST /api/mockups` response — the
 * caller resolves project/folder slugs from its own context).
 */

export type UploadParams =
  | {
      mode: 'add';
      file: File;
      name: string;
      projectId: string | null;
      folderId: string | null;
    }
  | {
      mode: 'replace';
      file: File;
      mockupId: string;
    };

export type UploadError =
  | { kind: 'invalid_name'; detail: string }
  | { kind: 'duplicate_name'; detail: string; existing?: { id: string; slug: string } }
  | { kind: 'file_too_large'; limit: number }
  | { kind: 'unsupported_type'; detail: string }
  | { kind: 'forbidden'; detail: string }
  | { kind: 'rate_limited'; retryAfter?: number }
  | { kind: 'server_error'; detail?: string }
  | { kind: 'network'; detail?: string }
  | { kind: 'aborted' };

export type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | {
      status: 'success';
      mockup: { id: string; slug: string; projectSlug?: string; folderPath?: string[] };
    }
  | { status: 'error'; route: 'field' | 'global'; error: UploadError };

export type UseUploadMockupApi = {
  state: UploadState;
  start: (p: UploadParams) => void;
  abort: () => void;
  reset: () => void;
};

const IDLE: UploadState = { status: 'idle' };

/**
 * Hard ceiling on a single upload. Five minutes covers the 10 MB cap
 * even on the slowest plausible mobile uplink (~30 kbps), and keeps a
 * hung connection from leaving the hook stuck in `{ status: 'uploading' }`
 * forever. The server enforces its own 413 long before this fires for
 * any well-behaved client.
 */
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

export function useUploadMockup(): UseUploadMockupApi {
  const [state, setState] = useState<UploadState>(IDLE);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const start = useCallback((params: UploadParams) => {
    // If something is in flight, abort it before starting fresh. The
    // dialog UI guards against this in practice (Submit disabled while
    // uploading), but the hook stays defensive.
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    const url =
      params.mode === 'replace' ? `/api/mockups/${params.mockupId}/version` : '/api/mockups';

    xhr.open('POST', url);
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    xhr.upload.addEventListener('progress', (event) => {
      // `lengthComputable === false` means the browser doesn't know the
      // total — we can't compute a ratio, so keep the previous progress
      // value rather than emitting NaN.
      if (!event.lengthComputable || !event.total) return;
      const progress = event.loaded / event.total;
      setState({ status: 'uploading', progress });
    });

    // `xhr.upload` is its own EventTarget — errors that happen DURING the
    // upload phase (network dropped mid-transfer, browser-side timeout,
    // user-initiated abort) fire on `xhr.upload`, not on the top-level
    // `xhr`. Without these listeners, a flaky connection mid-upload would
    // leave the hook stuck in `{ status: 'uploading' }` forever.
    xhr.upload.addEventListener('error', () => {
      if (xhrRef.current !== xhr) return;
      xhrRef.current = null;
      setState({
        status: 'error',
        route: 'global',
        error: { kind: 'network' },
      });
    });

    xhr.upload.addEventListener('timeout', () => {
      if (xhrRef.current !== xhr) return;
      xhrRef.current = null;
      setState({
        status: 'error',
        route: 'global',
        error: { kind: 'server_error', detail: 'timeout' },
      });
    });

    xhr.upload.addEventListener('abort', () => {
      // Defensive backstop: the imperative `abort()` method already
      // transitions the hook to `idle`, but if some other path triggers
      // `xhr.abort()` we still want to clear the in-flight ref so a
      // late `load` doesn't try to parse a torn-down response.
      if (xhrRef.current !== xhr) return;
      xhrRef.current = null;
    });

    xhr.addEventListener('load', () => {
      if (xhrRef.current !== xhr) return; // superseded by another start/abort
      xhrRef.current = null;
      const parsed = safeParseJson(xhr.responseText);
      const status = xhr.status;

      if (status >= 200 && status < 300) {
        if (!parsed || typeof parsed !== 'object') {
          setState({
            status: 'error',
            route: 'global',
            error: { kind: 'server_error', detail: 'invalid JSON response' },
          });
          return;
        }
        const body = parsed as {
          id?: unknown;
          slug?: unknown;
          projectSlug?: unknown;
          folderPath?: unknown;
        };
        if (typeof body.id !== 'string' || typeof body.slug !== 'string') {
          setState({
            status: 'error',
            route: 'global',
            error: { kind: 'server_error', detail: 'missing id/slug in response' },
          });
          return;
        }
        const mockup: {
          id: string;
          slug: string;
          projectSlug?: string;
          folderPath?: string[];
        } = { id: body.id, slug: body.slug };
        if (typeof body.projectSlug === 'string') {
          mockup.projectSlug = body.projectSlug;
        }
        if (Array.isArray(body.folderPath) && body.folderPath.every((s) => typeof s === 'string')) {
          mockup.folderPath = body.folderPath as string[];
        }
        setState({ status: 'success', mockup });
        return;
      }

      setState(routeErrorResponse(status, parsed));
    });

    xhr.addEventListener('error', () => {
      if (xhrRef.current !== xhr) return;
      xhrRef.current = null;
      setState({
        status: 'error',
        route: 'global',
        error: { kind: 'network' },
      });
    });

    // Send the FormData. The dialog reflects "uploading 0%" immediately
    // — the first real progress event from the browser will overwrite
    // this. We setState BEFORE send() so the UI repaints synchronously
    // on submit; abort during this initial render is impossible because
    // the user has no UI to click yet.
    setState({ status: 'uploading', progress: 0 });
    xhr.send(buildFormData(params));
  }, []);

  // `abort()` and `reset()` collapse to the same operation: drop any
  // in-flight XHR + return state to idle. The two names are kept for the
  // sake of the API surface — the dialog calls `abort()` mid-upload (the
  // user clicked Cancel) and `reset()` on close (a stale error/success
  // shouldn't survive into the next open). Same teardown either way.
  const abort = useCallback(() => {
    if (xhrRef.current) {
      const xhr = xhrRef.current;
      xhrRef.current = null;
      // Drop refs FIRST so the load/error listeners (which fire as a
      // side effect of `abort()` in some browsers) treat this XHR as
      // stale and no-op. Then call abort.
      xhr.abort();
    }
    setState(IDLE);
  }, []);

  const reset = abort;

  // Abort any in-flight request when the consumer unmounts. Otherwise
  // the load handler would fire and call setState on an unmounted tree.
  useEffect(() => {
    return () => {
      if (xhrRef.current) {
        const xhr = xhrRef.current;
        xhrRef.current = null;
        xhr.abort();
      }
    };
  }, []);

  return { state, start, abort, reset };
}

function buildFormData(params: UploadParams): FormData {
  const fd = new FormData();
  if (params.mode === 'replace') {
    fd.append('build', params.file);
    return fd;
  }
  fd.append('name', params.name);
  fd.append('build', params.file);
  if (params.projectId !== null) fd.append('projectId', params.projectId);
  if (params.folderId !== null) fd.append('folderId', params.folderId);
  return fd;
}

function safeParseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Maps an HTTP status + parsed body to a typed `UploadState` error.
 * Routing follows the spec at
 * `docs/superpowers/specs/2026-05-21-uploads-drag-drop-tech-spec.md`:
 *
 * | status | kind | route |
 * |--------|------|-------|
 * | 400 invalid_name | invalid_name | field |
 * | 409 duplicate_name | duplicate_name | field |
 * | 413 | file_too_large | global |
 * | 415 | unsupported_type | global |
 * | 403 | forbidden | global |
 * | 429 | rate_limited | global |
 * | 5xx / parse fail | server_error | global |
 */
function routeErrorResponse(status: number, body: unknown): UploadState {
  const errorTag = isRecord(body) && typeof body.error === 'string' ? body.error : null;
  const detail = isRecord(body) && typeof body.detail === 'string' ? body.detail : undefined;

  if (status === 400 && errorTag === 'invalid_name') {
    return {
      status: 'error',
      route: 'field',
      error: { kind: 'invalid_name', detail: detail ?? 'Invalid name' },
    };
  }

  if (status === 409 && errorTag === 'duplicate_name') {
    const existingRaw = isRecord(body) ? body.existing : undefined;
    const existing =
      isRecord(existingRaw) &&
      typeof existingRaw.id === 'string' &&
      typeof existingRaw.slug === 'string'
        ? { id: existingRaw.id, slug: existingRaw.slug }
        : undefined;
    return {
      status: 'error',
      route: 'field',
      error: {
        kind: 'duplicate_name',
        detail: detail ?? 'A mockup with this name already exists.',
        ...(existing ? { existing } : {}),
      },
    };
  }

  if (status === 413) {
    const limit =
      isRecord(body) && typeof body.limit === 'number' ? body.limit : MAX_UPLOAD_BYTES;
    return {
      status: 'error',
      route: 'global',
      error: { kind: 'file_too_large', limit },
    };
  }

  if (status === 415) {
    return {
      status: 'error',
      route: 'global',
      error: { kind: 'unsupported_type', detail: detail ?? 'Unsupported file type' },
    };
  }

  if (status === 403) {
    return {
      status: 'error',
      route: 'global',
      error: { kind: 'forbidden', detail: detail ?? 'Forbidden' },
    };
  }

  if (status === 429) {
    const retryAfter =
      isRecord(body) && typeof body.retryAfter === 'number' ? body.retryAfter : undefined;
    return {
      status: 'error',
      route: 'global',
      error: { kind: 'rate_limited', ...(retryAfter !== undefined ? { retryAfter } : {}) },
    };
  }

  // 5xx, unhandled 4xx, JSON parse failure — all funnel into server_error.
  return {
    status: 'error',
    route: 'global',
    error: { kind: 'server_error', detail },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
