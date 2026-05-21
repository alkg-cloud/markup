'use client';

import html2canvas from 'html2canvas';
import { useEffect, useState } from 'react';

/**
 * Three-state machine that drives the dialog's preview surface.
 *
 * - `loading`  — hook just mounted (or html2canvas in flight). `PreviewBox`
 *                renders a skeleton.
 * - `ready`    — html2canvas resolved with a base64 PNG; `PreviewBox`
 *                renders `<img src={dataUrl}>`.
 * - `fallback` — ZIP file (we can't render archives inline), iframe load
 *                timed out, or html2canvas threw. `PreviewBox` renders an
 *                icon with a reason note.
 */
export type PreviewState =
  | { state: 'loading'; dataUrl: null }
  | { state: 'ready'; dataUrl: string }
  | { state: 'fallback'; dataUrl: null; reason: 'zip' | 'timeout' | 'error' };

const LOADING: PreviewState = { state: 'loading', dataUrl: null };
const IFRAME_LOAD_TIMEOUT_MS = 3000;
const IFRAME_WIDTH_PX = 1280;
const IFRAME_HEIGHT_PX = 720;
const HTML2CANVAS_SCALE = 0.5;

/**
 * Generates a screenshot preview of an uploaded mockup file.
 *
 * For `.html` files: mounts an offscreen sandboxed iframe (`allow-same-origin`
 * only — JS is disabled to prevent untrusted user HTML from executing in our
 * origin), waits for `load` (or 3 s timeout), then screenshots the rendered
 * body with `html2canvas`.
 *
 * For `.zip` files: short-circuits to `fallback` — we don't unzip in the
 * browser just to draw a thumbnail.
 *
 * Cleanup on unmount or `file` change: the object URL is revoked, the iframe
 * is removed from the DOM, and the timeout is cancelled.
 */
export function useFilePreview(file: File | null): PreviewState {
  const [state, setState] = useState<PreviewState>(LOADING);

  // Reset to `loading` synchronously whenever the file identity changes, so
  // callers never observe a stale `ready` state for the previous file.
  // Without this, the previous file's screenshot would briefly persist until
  // the new effect ran and (eventually) overwrote the state.
  useEffect(() => {
    setState(LOADING);
  }, [file]);

  useEffect(() => {
    if (file === null) {
      // Idle guard — no work to do; reset effect above has already set
      // `loading`.
      return;
    }

    if (isZip(file)) {
      setState({ state: 'fallback', dataUrl: null, reason: 'zip' });
      return;
    }

    // AbortController is the project-wide convention for cancelling
    // async work in effects (see commit cb8a8f7 — code hygiene batch
    // that swept `let cancelled = …` flags out). The controller plays
    // three roles here:
    //   1. `signal.aborted` gates setState calls in the html2canvas
    //      `.then()` / `.catch()` callbacks (html2canvas itself takes
    //      no AbortSignal, so we gate at the resolution boundary).
    //   2. The iframe's `load` listener is registered with
    //      `{ signal }`, so the browser removes it on abort.
    //   3. The timeout is cleared explicitly in cleanup (setTimeout
    //      has no AbortSignal integration in jsdom / older Safari, so
    //      a manual clearTimeout is more portable than
    //      AbortSignal.timeout fan-in).
    const controller = new AbortController();
    const signal = controller.signal;
    const url = URL.createObjectURL(file);
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-same-origin');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = `${IFRAME_WIDTH_PX}px`;
    iframe.style.height = `${IFRAME_HEIGHT_PX}px`;
    iframe.style.border = '0';
    iframe.src = url;

    // Single teardown for every terminal branch (timeout, ready, error,
    // unmount). Idempotent: `clearTimeout` on an expired id, `iframe.remove`
    // on a detached node, and `URL.revokeObjectURL` on an already-revoked
    // URL are all harmless, so re-entering `cleanup` from the effect's
    // return is safe.
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      controller.abort();
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      iframe.remove();
      URL.revokeObjectURL(url);
    };

    timeoutId = setTimeout(() => {
      if (signal.aborted) return;
      cleanup();
      setState({ state: 'fallback', dataUrl: null, reason: 'timeout' });
    }, IFRAME_LOAD_TIMEOUT_MS);

    const onLoad = () => {
      if (signal.aborted) return;
      // Iframe loaded — defuse the load-timeout so html2canvas can take
      // whatever time it needs without us flipping to `fallback`.
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      const target = iframe.contentDocument?.body ?? iframe;
      html2canvas(target as HTMLElement, {
        scale: HTML2CANVAS_SCALE,
        useCORS: false,
        allowTaint: true,
      })
        .then((canvas) => {
          if (signal.aborted) return;
          const dataUrl = canvas.toDataURL('image/png');
          cleanup();
          setState({ state: 'ready', dataUrl });
        })
        .catch(() => {
          if (signal.aborted) return;
          cleanup();
          setState({ state: 'fallback', dataUrl: null, reason: 'error' });
        });
    };

    iframe.addEventListener('load', onLoad, { signal });
    document.body.appendChild(iframe);

    return cleanup;
  }, [file]);

  return state;
}

/**
 * Treats a file as a ZIP if EITHER its MIME or extension says so — Safari and
 * file-manager drag sources sometimes report `application/octet-stream` for
 * archives, and Linux file pickers sometimes report no MIME at all.
 */
function isZip(file: File): boolean {
  if (file.type.toLowerCase() === 'application/zip') return true;
  return file.name.toLowerCase().endsWith('.zip');
}
