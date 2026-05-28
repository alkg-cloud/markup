// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SEEDED_STATE, STORAGE_KEY } from '@/components/landing/InteractiveDemo/seeds';
import { useDemoStore } from '@/components/landing/InteractiveDemo/useDemoStore';

describe('useDemoStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns seeded state on first mount', () => {
    const { result } = renderHook(() => useDemoStore());
    expect(result.current.state.annotations).toHaveLength(SEEDED_STATE.annotations.length);
    expect(result.current.state.threads).toHaveLength(SEEDED_STATE.threads.length);
  });

  it('persists state changes to localStorage', () => {
    const { result } = renderHook(() => useDemoStore());
    act(() => {
      result.current.actions.selectAnnotation('a2');
    });
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(persisted.selectedAnnotId).toBe('a2');
  });

  it('cycleStatus rotates open → needs review → resolved → open', () => {
    const { result } = renderHook(() => useDemoStore());
    expect(result.current.state.threads.find((t) => t.id === 't1')?.status).toBe('open');
    act(() => {
      result.current.actions.cycleStatus('t1');
    });
    expect(result.current.state.threads.find((t) => t.id === 't1')?.status).toBe('needs review');
    act(() => {
      result.current.actions.cycleStatus('t1');
    });
    expect(result.current.state.threads.find((t) => t.id === 't1')?.status).toBe('resolved');
    act(() => {
      result.current.actions.cycleStatus('t1');
    });
    expect(result.current.state.threads.find((t) => t.id === 't1')?.status).toBe('open');
  });

  it('toggleReaction adds, increments mine, then removes on second click', () => {
    const { result } = renderHook(() => useDemoStore());
    act(() => {
      result.current.actions.toggleReaction('m2', '👀');
    });
    const after = result.current.state.reactions.find(
      (r) => r.messageId === 'm2' && r.emoji === '👀',
    );
    expect(after?.mine).toBe(true);
    expect(after?.count).toBe(1);
    act(() => {
      result.current.actions.toggleReaction('m2', '👀');
    });
    const removed = result.current.state.reactions.find(
      (r) => r.messageId === 'm2' && r.emoji === '👀',
    );
    expect(removed).toBeUndefined();
  });

  it('reset restores seeds and clears localStorage', () => {
    const { result } = renderHook(() => useDemoStore());
    act(() => {
      result.current.actions.selectAnnotation('a3');
    });
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    act(() => {
      result.current.actions.reset();
    });
    expect(result.current.state.selectedAnnotId).toBe(SEEDED_STATE.selectedAnnotId);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('addAnnotation creates an annotation + thread + first message together', () => {
    const { result } = renderHook(() => useDemoStore());
    const beforeAnnots = result.current.state.annotations.length;
    act(() => {
      result.current.actions.addAnnotation({
        anchor: { path: ':scope>body>section>h1', offsetX: 0.5, offsetY: 0.5 },
        body: 'New comment',
      });
    });
    expect(result.current.state.annotations).toHaveLength(beforeAnnots + 1);
    const newAnnot = result.current.state.annotations.at(-1);
    expect(newAnnot).toBeDefined();
    const newThread = result.current.state.threads.find((t) => t.annotationId === newAnnot?.id);
    expect(newThread?.status).toBe('open');
    expect(result.current.state.messages.some((m) => m.threadId === newThread?.id)).toBe(true);
  });

  it('toggleReaction decrements count and clears mine when others also reacted', () => {
    const { result } = renderHook(() => useDemoStore());
    // Seeded { messageId: 'm1', emoji: '👍', count: 3, mine: true } —
    // toggling should decrement (you + 2 agents → 2 agents), not remove
    // the pill entirely.
    act(() => {
      result.current.actions.toggleReaction('m1', '👍');
    });
    const after = result.current.state.reactions.find(
      (r) => r.messageId === 'm1' && r.emoji === '👍',
    );
    expect(after).toBeDefined();
    expect(after?.count).toBe(2);
    expect(after?.mine).toBe(false);
  });

  it('toggleReaction increments count and sets mine on a not-mine reaction (branch 3)', () => {
    const { result } = renderHook(() => useDemoStore());
    // The seeded reaction { messageId: 'm1', emoji: '🔥', count: 1, mine: false } is branch 3.
    act(() => {
      result.current.actions.toggleReaction('m1', '🔥');
    });
    const after = result.current.state.reactions.find(
      (r) => r.messageId === 'm1' && r.emoji === '🔥',
    );
    expect(after?.mine).toBe(true);
    expect(after?.count).toBe(2);
  });

  it('toggleReaction on a reply message does NOT touch primary reactions', () => {
    const { result } = renderHook(() => useDemoStore());
    // Reply m1r1 has no seeded reaction. Adding one must NOT change m1's
    // existing reactions — this is the threadId→messageId migration's
    // load-bearing invariant: reply reactions stay on the reply.
    const primaryBefore = result.current.state.reactions.filter((r) => r.messageId === 'm1');
    act(() => {
      result.current.actions.toggleReaction('m1r1', '👀');
    });
    const replyAfter = result.current.state.reactions.find(
      (r) => r.messageId === 'm1r1' && r.emoji === '👀',
    );
    const primaryAfter = result.current.state.reactions.filter((r) => r.messageId === 'm1');
    expect(replyAfter?.mine).toBe(true);
    expect(replyAfter?.count).toBe(1);
    expect(primaryAfter).toEqual(primaryBefore);
  });

  it('addReply ignores empty bodies and appends a message on a real body', () => {
    const { result } = renderHook(() => useDemoStore());
    const before = result.current.state.messages.length;
    act(() => {
      result.current.actions.addReply('t2', '   ');
    });
    expect(result.current.state.messages.length).toBe(before);

    act(() => {
      result.current.actions.addReply('t2', 'Looks good to me.');
    });
    expect(result.current.state.messages.length).toBe(before + 1);
    const last = result.current.state.messages.at(-1);
    expect(last?.threadId).toBe('t2');
    expect(last?.body).toBe('Looks good to me.');
    expect(last?.author).toBe('you');
  });
});
