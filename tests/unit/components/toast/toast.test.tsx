import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { toastReducer } from '@/components/Toast/useToast';

describe('toastReducer', () => {
  it('add action creates a toast with the given message', () => {
    const state = toastReducer([], { type: 'add', id: '1', message: 'Hello', duration: 3000 });
    expect(state).toHaveLength(1);
    expect(state[0].message).toBe('Hello');
    expect(state[0].id).toBe('1');
  });

  it('remove action deletes the matching toast', () => {
    const initial = [
      { id: '1', message: 'A' },
      { id: '2', message: 'B' },
    ];
    const state = toastReducer(initial, { type: 'remove', id: '1' });
    expect(state).toHaveLength(1);
    expect(state[0].id).toBe('2');
  });

  it('stacks multiple toasts (add twice)', () => {
    const s1 = toastReducer([], { type: 'add', id: '1', message: 'First', duration: 3000 });
    const s2 = toastReducer(s1, { type: 'add', id: '2', message: 'Second', duration: 3000 });
    expect(s2).toHaveLength(2);
  });
});

describe('ToastProvider SSR', () => {
  it('renders aria-live="assertive" container', async () => {
    const { ToastProvider } = await import('@/components/Toast/useToast');
    const html = renderToStaticMarkup(createElement(ToastProvider, null));
    expect(html).toContain('aria-live="assertive"');
  });
});
