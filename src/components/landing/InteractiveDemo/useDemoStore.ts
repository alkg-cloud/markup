'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SEEDED_STATE, STORAGE_KEY } from './seeds';
import type {
  Anchor,
  ColorIndex,
  DemoAnnotation,
  DemoDraft,
  DemoMessage,
  DemoState,
  DemoThread,
  ThreadStatus,
  ToolMode,
} from './types';

export type AddAnnotationArgs = { pins: Anchor[]; body: string; colorIndex?: number };
export type AddAnnotationResult = {
  annotation: DemoAnnotation;
  thread: DemoThread;
  message: DemoMessage;
};

const RID = () => Math.random().toString(36).slice(2, 7);

const STATUS_CYCLE: ThreadStatus[] = ['open', 'needs review', 'resolved'];

function loadInitial(): DemoState {
  if (typeof window === 'undefined') return SEEDED_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(SEEDED_STATE);
    const parsed = JSON.parse(raw) as DemoState;
    if (!parsed.annotations || !parsed.threads || !parsed.messages) {
      return structuredClone(SEEDED_STATE);
    }
    return parsed;
  } catch {
    return structuredClone(SEEDED_STATE);
  }
}

export function useDemoStore() {
  const [state, setState] = useState<DemoState>(loadInitial);
  const firstWrite = useRef(true);
  const skipWrite = useRef(false);

  useEffect(() => {
    if (firstWrite.current) {
      firstWrite.current = false;
      return;
    }
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // quota errors, private mode — silent
    }
  }, [state]);

  const selectAnnotation = useCallback((id: string | null) => {
    setState((s) => (s.selectedAnnotId === id ? s : { ...s, selectedAnnotId: id }));
  }, []);

  const setTool = useCallback((tool: ToolMode) => {
    setState((s) => (s.tool === tool ? s : { ...s, tool }));
  }, []);

  const cycleStatus = useCallback((threadId: string) => {
    setState((s) => ({
      ...s,
      threads: s.threads.map((t) => {
        if (t.id !== threadId) return t;
        const idx = STATUS_CYCLE.indexOf(t.status);
        const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
        return { ...t, status: next };
      }),
    }));
  }, []);

  const toggleReaction = useCallback((messageId: string, emoji: string) => {
    setState((s) => {
      const existing = s.reactions.find((r) => r.messageId === messageId && r.emoji === emoji);
      if (!existing) {
        return {
          ...s,
          reactions: [...s.reactions, { messageId, emoji, count: 1, mine: true }],
        };
      }
      if (existing.mine) {
        // If the user is the only reactor, drop the pill entirely.
        // Otherwise just remove the user's vote — leave the others' counts
        // intact (matches the real product's per-user reaction model and
        // avoids the "click 👍 once, all 3 reactors disappear" surprise).
        if (existing.count <= 1) {
          return {
            ...s,
            reactions: s.reactions.filter((r) => !(r.messageId === messageId && r.emoji === emoji)),
          };
        }
        return {
          ...s,
          reactions: s.reactions.map((r) =>
            r.messageId === messageId && r.emoji === emoji
              ? { ...r, count: r.count - 1, mine: false }
              : r,
          ),
        };
      }
      return {
        ...s,
        reactions: s.reactions.map((r) =>
          r.messageId === messageId && r.emoji === emoji
            ? { ...r, count: r.count + 1, mine: true }
            : r,
        ),
      };
    });
  }, []);

  const addReply = useCallback((threadId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setState((s) => {
      const now = Date.now();
      const msg: DemoMessage = {
        id: `m-${now}-${RID()}`,
        threadId,
        body: trimmed,
        author: 'you',
        createdAt: now,
      };
      return { ...s, messages: [...s.messages, msg] };
    });
  }, []);

  const addAnnotation = useCallback(
    (args: AddAnnotationArgs): AddAnnotationResult => {
      const now = Date.now();
      const annId = `a-${now}-${RID()}`;
      const threadId = `t-${now}-${RID()}`;
      const msgId = `m-${now}-${RID()}`;
      // Demo previously cycled a 5-color palette; production uses 16. Widen
      // the demo to match so visual variety stays aligned with prod when
      // users dogfood the demo.
      const colorIndex = ((args.colorIndex ?? state.annotations.length) % 16) as ColorIndex;
      // Multi-pin: each anchor in `args.pins` becomes its own DemoPin so
      // rendered annotations match the product's `anchors: AnchorRecord[]`
      // shape (one annotation can light up several places in the mockup).
      const annotation: DemoAnnotation = {
        id: annId,
        threadId,
        pins: args.pins.map((anchor, i) => ({ id: `p-${now}-${i}-${RID()}`, anchor })),
        colorIndex,
        createdAt: now,
      };
      const thread: DemoThread = { id: threadId, annotationId: annId, status: 'open' };
      const message: DemoMessage = {
        id: msgId,
        threadId,
        body: args.body.trim(),
        author: 'you',
        createdAt: now,
      };
      setState((s) => ({
        ...s,
        annotations: [...s.annotations, annotation],
        threads: [...s.threads, thread],
        messages: [...s.messages, message],
        draft: null,
        selectedAnnotId: annId,
      }));
      return { annotation, thread, message };
    },
    [state.annotations.length],
  );

  const setDraft = useCallback((draft: DemoDraft | null) => {
    setState((s) => ({ ...s, draft }));
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
    skipWrite.current = true;
    setState(structuredClone(SEEDED_STATE));
  }, []);

  const actions = useMemo(
    () => ({
      selectAnnotation,
      setTool,
      cycleStatus,
      toggleReaction,
      addReply,
      addAnnotation,
      setDraft,
      reset,
    }),
    [
      selectAnnotation,
      setTool,
      cycleStatus,
      toggleReaction,
      addReply,
      addAnnotation,
      setDraft,
      reset,
    ],
  );

  return { state, actions };
}
