import { useCallback, useEffect, useRef } from 'react';
import {
  DRAFT_DEBOUNCE_MS,
  type Draft,
  type DraftState,
  STALE_DRAFT_MS,
  STORAGE_SCHEMA_VERSION,
  type StoredDraft,
  storageKey,
} from '@/components/MockupViewer/draft-types';
import { useDebounce } from './useDebounce';

export interface UseDraftPersistenceArgs {
  mockupId: string;
  userId: string;
  draft: DraftState;
  onRestore: (stored: StoredDraft) => void;
  onFlushed: (lastSavedAt: number) => void;
  /** When false, the hook skips every localStorage read/write and never
   *  invokes `onRestore` / `onFlushed`. The state-machine wiring in the
   *  caller still runs — only the persistence backing store is disabled. */
  enabled?: boolean;
}

export interface UseDraftPersistenceReturn {
  flush: () => void;
  clear: () => void;
}

function readStored(key: string): StoredDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (parsed.schemaVersion !== STORAGE_SCHEMA_VERSION) return null;
    if (typeof parsed.body !== 'string') return null;
    if (!Array.isArray(parsed.pins)) return null;
    if (typeof parsed.lastSavedAt !== 'number') return null;
    if (Date.now() - parsed.lastSavedAt > STALE_DRAFT_MS) return null;
    return parsed as StoredDraft;
  } catch {
    return null;
  }
}

function writeStored(key: string, draft: Draft, now: number): void {
  const payload: StoredDraft = {
    body: draft.body,
    pins: draft.pins,
    lastSavedAt: now,
    schemaVersion: STORAGE_SCHEMA_VERSION,
  };
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn('[useDraftPersistence] localStorage.setItem failed', e);
  }
}

function removeStored(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('[useDraftPersistence] localStorage.removeItem failed', e);
  }
}

export function useDraftPersistence(args: UseDraftPersistenceArgs): UseDraftPersistenceReturn {
  const { mockupId, userId, draft, onRestore, onFlushed, enabled = true } = args;
  const key = storageKey(mockupId, userId);
  const restoredRef = useRef(false);

  // 1) Restore on mount (once per key).
  useEffect(() => {
    if (!enabled) return;
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (typeof window === 'undefined') return;
    const stored = readStored(key);
    if (stored) {
      onRestore(stored);
    } else {
      removeStored(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  // 2) Debounced auto-save on draft change.
  const debouncedSave = useDebounce((d: Draft) => {
    const now = Date.now();
    writeStored(key, d, now);
    onFlushed(now);
  }, DRAFT_DEBOUNCE_MS);

  useEffect(() => {
    if (!enabled) return;
    if (!draft) return;
    if (!draft.hasUnsavedChanges) return;
    debouncedSave(draft);
  }, [draft, debouncedSave, enabled]);

  // 3) Flush on visibilitychange + beforeunload.
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    function flushIfDirty() {
      if (!draft?.hasUnsavedChanges) return;
      const now = Date.now();
      writeStored(key, draft, now);
      onFlushed(now);
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') flushIfDirty();
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', flushIfDirty);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', flushIfDirty);
    };
  }, [draft, key, onFlushed, enabled]);

  const flush = useCallback(() => {
    if (!enabled) return;
    if (!draft) return;
    const now = Date.now();
    writeStored(key, draft, now);
    onFlushed(now);
  }, [draft, key, onFlushed, enabled]);

  const clear = useCallback(() => {
    if (!enabled) return;
    removeStored(key);
  }, [key, enabled]);

  return { flush, clear };
}
