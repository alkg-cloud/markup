/** @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { AgentsClient } from '@/app/(app)/settings/agents/AgentsClient';

const tokens = [
  {
    id: 't1',
    name: 'Production Agent',
    createdAt: '2026-05-13T00:00:00Z',
    lastUsedAt: '2026-05-16T08:00:00Z',
    prefix: 'mk_live_',
    lastFour: 'a3f7',
  },
];

describe('AgentsClient cards layout', () => {
  it('renders each token as a card with name + masked preview', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(AgentsClient, { initialTokens: tokens }));
    });
    expect(container.textContent).toContain('Production Agent');
    expect(container.textContent).toMatch(/mk_live_•+a3f7/);
    act(() => root.unmount());
    container.remove();
  });

  it('renders copy and revoke buttons per token', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(AgentsClient, { initialTokens: tokens }));
    });
    expect(container.querySelector('button[aria-label*="Copy" i]')).toBeTruthy();
    expect(container.querySelector('button[aria-label*="Revoke" i]')).toBeTruthy();
    act(() => root.unmount());
    container.remove();
  });

  it("renders a 'New Token' action button (with plus icon) instead of 'Create →'", () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(AgentsClient, { initialTokens: tokens }));
    });
    const buttons = Array.from(container.querySelectorAll('button'));
    // The DS uses an SVG plus icon followed by literal text "New Token".
    const newTokenBtn = buttons.find((b) =>
      b.textContent?.trim().toLowerCase().includes('new token'),
    );
    expect(newTokenBtn).toBeTruthy();
    expect(newTokenBtn?.querySelector('svg')).toBeTruthy();
    expect(buttons.some((b) => b.textContent?.includes('Create →'))).toBe(false);
    act(() => root.unmount());
    container.remove();
  });

  it("renders 'never' when lastUsedAt is null", () => {
    const noUse = [{ ...tokens[0], lastUsedAt: null }];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(AgentsClient, { initialTokens: noUse }));
    });
    expect(container.textContent).toContain('never');
    act(() => root.unmount());
    container.remove();
  });
});
