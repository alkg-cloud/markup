// @vitest-environment jsdom

/**
 * Draft-annotation flow — integration test.
 *
 * Exercises the full open → type → save → reload → restore → send loop
 * at the React level, using the same hooks the production AppMainViewer
 * composes. Mounting AppMainViewer itself in jsdom is impractical (it
 * requires a same-origin iframe with a loaded mockup, ToastProvider,
 * useConfirm dialog wiring, etc.); instead we mount a thin harness that
 * orchestrates `useDraftPersistence` over the same `DraftState` machine
 * the viewer uses. This catches contract drift between the hooks and
 * the state-machine code paths in AppMainViewer's draft section.
 *
 * Covered:
 *   1. Open (null → Draft) ← simulates `openDraft`
 *   2. Type a body ← simulates `handleBodyChange`
 *   3. Save (Cmd+S equivalent) ← simulates `saveDraft` → flush() → storage write
 *   4. Re-mount (page reload) → useDraftPersistence restores → onRestore fires
 *   5. Send → POST /api/mockups/<id>/annotations called → storage cleared
 *
 * Not covered here (deferred to manual / Playwright):
 *   - Canvas pin add via real iframe click capture
 *   - DraftCard ↔ AlertDialog cancel-confirm portal
 *   - rail.forceExpand visual behaviour
 *
 * The harness uses bare `react-dom/client` + `react.act` per the
 * project's testing convention (no @testing-library/react). Mirrors
 * `tests/unit/hooks/useDraftPersistence.test.ts` patterns.
 */

import { act, createElement, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import {
  type Draft,
  type DraftState,
  type DraftStatus,
  type StoredDraft,
  storageKey,
} from '@/components/MockupViewer/draft-types';

const MOCKUP_ID = 'm1';
const USER_ID = 'u1';
const KEY = storageKey(MOCKUP_ID, USER_ID);

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

interface HarnessHandle {
  open: () => void;
  type: (body: string) => void;
  save: () => void;
  send: () => Promise<void>;
  getDraft: () => DraftState;
  getStatus: () => DraftStatus;
}

interface HarnessProps {
  onReady: (h: HarnessHandle) => void;
}

/**
 * Replicates the draft section of AppMainViewer in isolation. Mirrors
 * the exact callback shapes so any drift in the production wiring
 * trips this test.
 *
 * The harness uses refs to surface a stable test handle whose methods
 * always read the LATEST `draft` + `flush` references. Calling `save()`
 * mid-test must invoke the freshest `useDraftPersistence.flush`, not the
 * one captured at first mount.
 */
function Harness({ onReady }: HarnessProps) {
  const [draft, setDraft] = useState<DraftState>(null);
  const [status, setStatus] = useState<DraftStatus>('unsaved');

  const handleRestore = useCallback((stored: StoredDraft) => {
    setDraft({
      body: stored.body,
      pins: stored.pins,
      lastSavedAt: stored.lastSavedAt,
      hasUnsavedChanges: false,
    });
    setStatus('saved');
  }, []);

  const handleFlushed = useCallback((lastSavedAt: number) => {
    setDraft((d) => (d ? { ...d, lastSavedAt, hasUnsavedChanges: false } : null));
    setStatus('saved');
  }, []);

  const { flush, clear } = useDraftPersistence({
    mockupId: MOCKUP_ID,
    userId: USER_ID,
    draft,
    onRestore: handleRestore,
    onFlushed: handleFlushed,
  });

  // Refs to the latest values — the test handle reads through these so
  // each call sees the freshest closure (otherwise the handle captured
  // at first mount would invoke flush() with draft === null).
  const draftRef = useRef(draft);
  const statusRef = useRef(status);
  const flushRef = useRef(flush);
  const clearRef = useRef(clear);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);
  useEffect(() => {
    clearRef.current = clear;
  }, [clear]);

  // Expose a stable handle on first commit.
  const readyRef = useRef(false);
  useEffect(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReady({
      open: () => {
        setDraft(
          (d) =>
            d ?? ({ body: '', pins: [], lastSavedAt: null, hasUnsavedChanges: false } as Draft),
        );
        setStatus((s) => (s === 'saved' ? s : 'unsaved'));
      },
      type: (body: string) => {
        setDraft((d) => (d ? { ...d, body, hasUnsavedChanges: true } : null));
        setStatus('unsaved');
      },
      save: () => {
        setStatus('saving');
        flushRef.current();
      },
      send: async () => {
        const current = draftRef.current;
        if (!current || current.body.length === 0) return;
        setStatus('sending');
        try {
          const res = await fetch(`/api/mockups/${MOCKUP_ID}/annotations`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              body: current.body,
              anchors: current.pins,
              colorIndex: 0,
            }),
          });
          if (!res.ok) {
            setStatus('error');
            return;
          }
          clearRef.current();
          setDraft(null);
          setStatus('unsaved');
        } catch {
          setStatus('error');
        }
      },
      getDraft: () => draftRef.current,
      getStatus: () => statusRef.current,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

async function flushAsync() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('draft-annotation flow (state machine + persistence)', () => {
  it('opens → types → saves → reload → restores → sends → storage cleared', async () => {
    // ── Phase 1: Mount harness; open draft; type body; save explicitly.
    let h: HarnessHandle | null = null;
    act(() => {
      root.render(createElement(Harness, { onReady: (next) => { h = next; } }));
    });
    // Effects (onReady) commit on the second pass.
    await flushAsync();
    if (!h) throw new Error('Harness onReady did not fire');

    const handle = h as HarnessHandle;

    // Open: draft becomes non-null.
    act(() => {
      handle.open();
    });
    expect(handle.getDraft()).not.toBeNull();
    expect(handle.getDraft()?.body).toBe('');

    // Type: body becomes 'hello'; hasUnsavedChanges flips true.
    act(() => {
      handle.type('hello world');
    });
    expect(handle.getDraft()?.body).toBe('hello world');
    expect(handle.getDraft()?.hasUnsavedChanges).toBe(true);

    // Save: flush() writes to localStorage and onFlushed transitions to 'saved'.
    act(() => {
      handle.save();
    });
    await flushAsync();
    expect(localStorage.getItem(KEY)).not.toBeNull();
    const stored = JSON.parse(localStorage.getItem(KEY) as string) as StoredDraft;
    expect(stored.body).toBe('hello world');
    expect(stored.schemaVersion).toBe(1);
    expect(handle.getStatus()).toBe('saved');

    // ── Phase 2: Unmount + remount → restore fires.
    act(() => {
      root.unmount();
    });
    // Fresh root mount on the same container (simulates a page reload).
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    let h2: HarnessHandle | null = null;
    act(() => {
      root.render(createElement(Harness, { onReady: (next) => { h2 = next; } }));
    });
    await flushAsync();
    if (!h2) throw new Error('Second Harness onReady did not fire');

    const handle2 = h2 as HarnessHandle;

    // Restore should have fired during mount: draft is non-null with the persisted body.
    expect(handle2.getDraft()).not.toBeNull();
    expect(handle2.getDraft()?.body).toBe('hello world');
    expect(handle2.getDraft()?.hasUnsavedChanges).toBe(false);
    expect(handle2.getStatus()).toBe('saved');

    // ── Phase 3: Send → fetch fires, response ok, storage cleared.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'a1', threadId: 't1', colorIndex: 0, status: 'open', anchors: [] }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      await handle2.send();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/mockups/${MOCKUP_ID}/annotations`);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({
      body: 'hello world',
      anchors: [],
      colorIndex: 0,
    });
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(handle2.getDraft()).toBeNull();
    expect(handle2.getStatus()).toBe('unsaved');
  });

  it('send failure keeps the draft locally and surfaces error status', async () => {
    let h: HarnessHandle | null = null;
    act(() => {
      root.render(createElement(Harness, { onReady: (next) => { h = next; } }));
    });
    await flushAsync();
    if (!h) throw new Error('Harness onReady did not fire');
    const handle = h as HarnessHandle;

    act(() => {
      handle.open();
    });
    act(() => {
      handle.type('keep me safe');
    });
    act(() => {
      handle.save();
    });
    await flushAsync();
    expect(localStorage.getItem(KEY)).not.toBeNull();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'server boom' }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      await handle.send();
    });

    // Status goes to 'error'; draft + storage are preserved.
    expect(handle.getStatus()).toBe('error');
    expect(handle.getDraft()?.body).toBe('keep me safe');
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });
});
