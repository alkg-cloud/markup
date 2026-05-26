import { useEffect, useRef } from 'react';

/**
 * Fires `onInvalidViewingVid` at most once per distinct unknown `viewingVid`.
 *
 * The viewer enters "historic mode" when the URL carries `?v=<vid>`. If the
 * vid does not match any row in the loaded `versions[]`, the parent needs
 * to canonicalize the URL (drop `?v`) and toast the user. The guard ref
 * ensures a single notification per bad value: it resets whenever the
 * condition clears (i.e. `viewingVid` becomes null or matches a known row),
 * so a new unknown vid arriving later does fire again. The ref also guards
 * against unstable callback identities in the dep array — re-runs caused by
 * a new `onInvalidViewingVid` reference still hit the early-return.
 */
export function useInvalidViewingVidNotifier(args: {
  viewingVid: string | null | undefined;
  isViewingKnown: boolean;
  onInvalidViewingVid: (() => void) | undefined;
}): void {
  const { viewingVid, isViewingKnown, onInvalidViewingVid } = args;
  const hasCalledRef = useRef(false);
  useEffect(() => {
    if (!viewingVid || isViewingKnown) {
      hasCalledRef.current = false;
      return;
    }
    if (hasCalledRef.current) return;
    hasCalledRef.current = true;
    onInvalidViewingVid?.();
  }, [viewingVid, isViewingKnown, onInvalidViewingVid]);
}
