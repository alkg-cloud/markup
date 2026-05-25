'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_VIEWPORT,
  type Orientation,
  VIEWPORT_PRESETS,
  type ViewportMode,
  type ViewportState,
} from './viewport-presets';

/** localStorage value shape. Bump `v` when the shape changes. */
interface StoredViewport {
  v: 1;
  mode: ViewportMode;
  width: number | null;
  height: number | null;
  orientation: Orientation;
}

const SCHEMA_VERSION = 1 as const;

export interface UseViewportReturn {
  viewport: ViewportState;
  setViewport: (next: ViewportState) => void;
  presets: typeof VIEWPORT_PRESETS;
}

function storageKey(mockupId: string): string {
  return `viewport:${mockupId}`;
}

function readStorage(mockupId: string | undefined): ViewportState {
  if (!mockupId) return DEFAULT_VIEWPORT;
  let raw: string | null;
  try {
    raw = localStorage.getItem(storageKey(mockupId));
  } catch {
    return DEFAULT_VIEWPORT;
  }
  if (!raw) return DEFAULT_VIEWPORT;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_VIEWPORT;
  }
  if (!parsed || typeof parsed !== 'object' || (parsed as StoredViewport).v !== SCHEMA_VERSION) {
    return DEFAULT_VIEWPORT;
  }
  const p = parsed as StoredViewport;
  return {
    mode: p.mode,
    width: p.width,
    height: p.height,
    orientation: p.orientation,
  };
}

function writeStorage(mockupId: string | undefined, state: ViewportState): void {
  if (!mockupId) return;
  const payload: StoredViewport = {
    v: SCHEMA_VERSION,
    mode: state.mode,
    width: state.width,
    height: state.height,
    orientation: state.orientation,
  };
  try {
    localStorage.setItem(storageKey(mockupId), JSON.stringify(payload));
  } catch {
    /* storage full or private mode — fall back to in-memory only */
  }
}

export function useViewport(mockupId: string | undefined): UseViewportReturn {
  const [viewport, setViewportState] = useState<ViewportState>(() => readStorage(mockupId));

  // Re-read when mockupId changes (different mockup loaded).
  useEffect(() => {
    setViewportState(readStorage(mockupId));
  }, [mockupId]);

  const setViewport = useCallback(
    (next: ViewportState) => {
      setViewportState(next);
      writeStorage(mockupId, next);
    },
    [mockupId],
  );

  return { viewport, setViewport, presets: VIEWPORT_PRESETS };
}
