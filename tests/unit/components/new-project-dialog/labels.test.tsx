/** @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { NewProjectDialog } from '@/components/NewProjectDialog/NewProjectDialog';

describe('NewProjectDialog labels', () => {
  it('renders sentence-case labels, a Create button, and a URL-safe placeholder', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(NewProjectDialog, {
          open: true,
          onClose: () => {},
          onSaved: () => {},
        }),
      );
    });
    // Labels use the catalog's 10 px uppercase treatment via CSS — the
    // *content* itself is sentence-case so screen readers + manual
    // copy-paste read naturally.
    expect(container.textContent).toContain('Project name');
    expect(container.textContent).toContain('Icon');
    // Primary action drops the redundant noun (title already says "New
    // Project" / "Edit Project").
    expect(container.textContent).toContain('Create');
    const input = container.querySelector('input[placeholder]');
    // Placeholder uses URL-safe punctuation (hyphen, not space) — the
    // name itself becomes a URL path segment.
    expect(input?.getAttribute('placeholder')).toBe('My-Project');
    act(() => root.unmount());
    container.remove();
  });
});
