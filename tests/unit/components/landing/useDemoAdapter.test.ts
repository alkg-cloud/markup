// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDemoAdapter } from '@/components/landing/InteractiveDemo/demoAdapter';
import { useDemoStore } from '@/components/landing/InteractiveDemo/useDemoStore';
import type { AppMainAnnotation } from '@/components/MockupViewer/AppMainViewer';

function useDemoAdapterTestHarness() {
  const { state, actions } = useDemoStore();
  const adapter = useDemoAdapter(state, actions);
  return { state, actions, adapter };
}

describe('useDemoAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('maps DemoAnnotation[] to AppMainAnnotation[] with label + colorIndex', () => {
    const { result } = renderHook(() => useDemoAdapterTestHarness());
    expect(result.current.adapter.annotations.length).toBeGreaterThan(0);
    const first = result.current.adapter.annotations[0];
    expect(first).toMatchObject({
      id: expect.any(String),
      label: 1,
      colorIndex: expect.any(Number),
      anchors: expect.any(Array),
    });
    // Threads → status surface comes through.
    expect(['open', 'needs review', 'resolved']).toContain(first.status);
    // The primary message lands as `primary`.
    expect(first.primary.body).toMatch(/.+/);
  });

  it('onCreateAnnotation appends to the store and returns the new AppMainAnnotation', async () => {
    const { result } = renderHook(() => useDemoAdapterTestHarness());
    const before = result.current.adapter.annotations.length;
    const createdHolder: { value: AppMainAnnotation | null } = { value: null };
    await act(async () => {
      createdHolder.value = await result.current.adapter.handlers.onCreateAnnotation({
        body: 'hello from the demo',
        anchors: [{ path: ':scope>body>section>h1', offsetX: 0.5, offsetY: 0.5 }],
        colorIndex: 0,
      });
    });
    const created = createdHolder.value;
    expect(created).not.toBeNull();
    expect(created?.id).toMatch(/^a-/);
    expect(created?.primary.body).toBe('hello from the demo');
    expect(created?.anchors).toHaveLength(1);
    expect(result.current.adapter.annotations.length).toBe(before + 1);
  });

  it('onPostReply appends a reply message to the right thread', async () => {
    const { result } = renderHook(() => useDemoAdapterTestHarness());
    const target = result.current.adapter.annotations[0];
    const beforeMessages = result.current.state.messages.filter(
      (m) => m.threadId === target.threadId,
    ).length;
    await act(async () => {
      await result.current.adapter.handlers.onPostReply(target.id, 'reply body');
    });
    const afterMessages = result.current.state.messages.filter(
      (m) => m.threadId === target.threadId,
    ).length;
    expect(afterMessages).toBe(beforeMessages + 1);
    // The store appends the reply with author 'you', not synthesizes the
    // synthesized stub the adapter returns.
    const last = result.current.state.messages.filter((m) => m.threadId === target.threadId).at(-1);
    expect(last?.body).toBe('reply body');
    expect(last?.author).toBe('you');
  });

  it('onReactionToggle wraps the store toggle', async () => {
    const { result } = renderHook(() => useDemoAdapterTestHarness());
    const messageId = result.current.state.messages[0].id;
    await act(async () => {
      await result.current.adapter.handlers.onReactionToggle(messageId, '🚀');
    });
    expect(
      result.current.state.reactions.some((r) => r.messageId === messageId && r.emoji === '🚀'),
    ).toBe(true);
  });

  it('onAnnotationStatusChange cycles the matching thread status', async () => {
    const { result } = renderHook(() => useDemoAdapterTestHarness());
    const target = result.current.adapter.annotations.find((a) => a.status === 'open');
    expect(target).toBeDefined();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.adapter.handlers.onAnnotationStatusChange(
        target!.id,
        'needs review',
      );
    });
    expect(ok).toBe(true);
    const refreshed = result.current.adapter.annotations.find((a) => a.id === target!.id);
    expect(refreshed?.status).toBe('needs review');
  });

  it('onCommentEdit / onCommentDelete / onAnnotationDelete all return false (demo no-op)', async () => {
    const { result } = renderHook(() => useDemoAdapterTestHarness());
    const target = result.current.adapter.annotations[0];
    const messageId = target.primary.id;
    let edit: boolean | undefined;
    let del: boolean | undefined;
    let annDel: boolean | undefined;
    await act(async () => {
      edit = await result.current.adapter.handlers.onCommentEdit(messageId, 'updated');
      del = await result.current.adapter.handlers.onCommentDelete(messageId);
      annDel = await result.current.adapter.handlers.onAnnotationDelete(target.id);
    });
    expect(edit).toBe(false);
    expect(del).toBe(false);
    expect(annDel).toBe(false);
  });
});
