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

    let cancelled = false;
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

    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      cleanup();
      setState({ state: 'fallback', dataUrl: null, reason: 'timeout' });
    }, IFRAME_LOAD_TIMEOUT_MS);

    const onLoad = () => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      const target = iframe.contentDocument?.body ?? iframe;
      html2canvas(target as HTMLElement, {
        scale: HTML2CANVAS_SCALE,
        useCORS: false,
        allowTaint: true,
      })
        .then((canvas) => {
          if (cancelled) return;
          const dataUrl = canvas.toDataURL('image/png');
          cancelled = true;
          cleanup();
          setState({ state: 'ready', dataUrl });
        })
        .catch(() => {
          if (cancelled) return;
          cancelled = true;
          cleanup();
          setState({ state: 'fallback', dataUrl: null, reason: 'error' });
        });
    };

    iframe.addEventListener('load', onLoad);
    document.body.appendChild(iframe);

    function cleanup() {
      iframe.removeEventListener('load', onLoad);
      iframe.remove();
      URL.revokeObjectURL(url);
    }

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      cleanup();
    };
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
