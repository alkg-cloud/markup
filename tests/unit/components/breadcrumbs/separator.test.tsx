// @vitest-environment jsdom

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

describe('Breadcrumbs separator', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it("renders '›' between segments, never '/'", async () => {
    const { Breadcrumbs } = await import('@/components/Breadcrumbs/Breadcrumbs');
    const segments = [
      { label: 'Markup dev', href: '/?project=markup-dev' },
      { label: 'Design System', href: '/designs' },
    ];
    const html = renderToStaticMarkup(createElement(Breadcrumbs, { segments }));

    // Should contain the chevron
    expect(html).toContain('›');

    // Verify that the chevron is in the separator span
    expect(html).toMatch(/class="[^"]*separator[^"]*">›<\/span>/);

    // Should NOT have a literal "/" as displayed separator
    // (it's allowed in href, but not as a rendered separator text node)
    expect(html).not.toMatch(/separator[^>]*>\/</);
  });

  it('separators have aria-hidden attribute', async () => {
    const { Breadcrumbs } = await import('@/components/Breadcrumbs/Breadcrumbs');
    const segments = [
      { label: 'First', href: '/first' },
      { label: 'Second', href: '/second' },
      { label: 'Third', href: '/third' },
    ];
    const html = renderToStaticMarkup(createElement(Breadcrumbs, { segments }));

    // Should have aria-hidden on separators
    expect(html).toMatch(/aria-hidden="true"[^>]*class="[^"]*separator/);
  });

  it('renders multiple separators with chevron for multi-segment breadcrumbs', async () => {
    const { Breadcrumbs } = await import('@/components/Breadcrumbs/Breadcrumbs');
    const segments = [
      { label: 'A', href: '/a' },
      { label: 'B', href: '/b' },
      { label: 'C', href: '/c' },
    ];
    const html = renderToStaticMarkup(createElement(Breadcrumbs, { segments }));

    // Count occurrences of the separator chevron
    const chevronMatches = html.match(/›/g) || [];
    // Should have 2 separators for 3 segments
    expect(chevronMatches.length).toBe(2);

    // Verify no "/" separators
    expect(html).not.toMatch(/separator[^>]*>\/</);
  });
});
