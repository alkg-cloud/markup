'use client';

import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

/**
 * Live media-query reactive boolean — `true` when the viewport is at
 * or below the mobile breakpoint (767 px). SSR-safe: returns `false`
 * on the server / first paint, then the effect upgrades to the real
 * value on mount. Subscribes to MediaQueryList so rotations and
 * window resizes flip the value without remount.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
