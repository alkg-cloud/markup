/** @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentsClient } from '@/app/(app)/settings/agents/AgentsClient';

const tokens = [
  {
    id: 't1',
    name: 'Prod',
    createdAt: '2026-05-13T00:00:00Z',
    lastUsedAt: '2026-05-16T08:00:00Z',
    prefix: 'mk_live_',
    lastFour: 'a3f7',
  },
];

describe('AgentsClient copy action', () => {
  let writeText: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  it('calls navigator.clipboard.writeText with the masked token on copy click', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(AgentsClient, { initialTokens: tokens }));
    });
    const copyBtn = container.querySelector('button[aria-label*="Copy" i]') as HTMLButtonElement;
    act(() => {
      copyBtn.click();
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(writeText).toHaveBeenCalledTimes(1);
    const arg = writeText.mock.calls[0][0];
    expect(arg).toMatch(/^mk_live_•+a3f7$/);
    act(() => root.unmount());
    container.remove();
  });
});
