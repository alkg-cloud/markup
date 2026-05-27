// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDemoStore } from '@/components/landing/InteractiveDemo/useDemoStore';
import { SEEDED_STATE, STORAGE_KEY } from '@/components/landing/InteractiveDemo/seeds';

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
    act(() => { result.current.actions.cycleStatus('t1'); });
    expect(result.current.state.threads.find((t) => t.id === 't1')?.status).toBe('needs review');
    act(() => { result.current.actions.cycleStatus('t1'); });
    expect(result.current.state.threads.find((t) => t.id === 't1')?.status).toBe('resolved');
    act(() => { result.current.actions.cycleStatus('t1'); });
    expect(result.current.state.threads.find((t) => t.id === 't1')?.status).toBe('open');
  });

  it('toggleReaction adds, increments mine, then removes on second click', () => {
    const { result } = renderHook(() => useDemoStore());
    act(() => { result.current.actions.toggleReaction('t2', '👀'); });
    const after = result.current.state.reactions.find((r) => r.threadId === 't2' && r.emoji === '👀');
    expect(after?.mine).toBe(true);
    expect(after?.count).toBe(1);
    act(() => { result.current.actions.toggleReaction('t2', '👀'); });
    const removed = result.current.state.reactions.find((r) => r.threadId === 't2' && r.emoji === '👀');
    expect(removed).toBeUndefined();
  });

  it('reset restores seeds and clears localStorage', () => {
    const { result } = renderHook(() => useDemoStore());
    act(() => { result.current.actions.selectAnnotation('a3'); });
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    act(() => { result.current.actions.reset(); });
    expect(result.current.state.selectedAnnotId).toBe(SEEDED_STATE.selectedAnnotId);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('addAnnotation creates an annotation + thread + first message together', () => {
    const { result } = renderHook(() => useDemoStore());
    const beforeAnnots = result.current.state.annotations.length;
    act(() => {
      result.current.actions.addAnnotation({
        pin: { id: 'pX', xPct: 50, yPct: 50 },
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
});
