/** @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

// Import the client component (more renderable than the server page).
import { AgentsClient } from '@/app/(app)/settings/agents/AgentsClient';

describe('Agent tokens page header', () => {
  it("renders 'Agent Tokens' (Title Case) title", () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(AgentsClient, { initial: [] }));
    });
    const heading = container.querySelector('h1');
    expect(heading?.textContent?.trim()).toBe('Agent Tokens');
    expect(container.textContent).toContain('API tokens for agent integrations');
    expect(container.textContent).not.toContain('non-browser clients');
    act(() => root.unmount());
    container.remove();
  });
});
