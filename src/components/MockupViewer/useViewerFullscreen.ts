'use client';

import { useCallback, useEffect, useState } from 'react';

/* ── Fullscreen toggle for the AppMain viewer ─────────────────────────────
 *
 * Wraps `requestFullscreen`/`exitFullscreen` against a caller-supplied
 * element ref and tracks the actual fullscreen state via the
 * `fullscreenchange` event (so external Esc-to-exit syncs back into UI).
 */
export function useViewerFullscreen(elementRef: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setFullscreen] = useState(false);

  const toggle = useCallback(() => {
    const el = elementRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    } else {
      void el.requestFullscreen?.();
    }
  }, [elementRef]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  return { isFullscreen, toggle };
}
