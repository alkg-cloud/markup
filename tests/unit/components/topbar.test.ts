import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

function renderHTML(component: React.ReactElement): string {
  return renderToStaticMarkup(component);
}

describe('Topbar', () => {
  it('renders without crash with empty breadcrumbs', async () => {
    const { Topbar } = await import('@/components/Topbar/Topbar');
    const html = renderHTML(createElement(Topbar, { breadcrumbs: [] }));
    expect(html).toContain('<header');
    expect(html).toContain('Search...');
  });

  it('renders breadcrumb segments', async () => {
    const { Topbar } = await import('@/components/Topbar/Topbar');
    const segments = [
      { label: 'Home', href: '/projects/home' },
      { label: 'Designs', href: '/projects/home/designs' },
    ];
    const html = renderHTML(createElement(Topbar, { breadcrumbs: segments }));
    expect(html).toContain('Home');
    expect(html).toContain('Designs');
  });

  it('renders search pill with text and keyboard shortcut', async () => {
    const { Topbar } = await import('@/components/Topbar/Topbar');
    const html = renderHTML(createElement(Topbar, { breadcrumbs: [] }));
    expect(html).toContain('Search...');
    expect(html).toContain('⌘K');
    expect(html).toContain('aria-label="Search... (⌘K)"');
  });

  it('renders avatar button with user initial', async () => {
    const { Topbar } = await import('@/components/Topbar/Topbar');
    const html = renderHTML(createElement(Topbar, { breadcrumbs: [], userName: 'Maria' }));
    expect(html).toContain('>M<');
  });

  it('renders default avatar initial when no userName', async () => {
    const { Topbar } = await import('@/components/Topbar/Topbar');
    const html = renderHTML(createElement(Topbar, { breadcrumbs: [] }));
    expect(html).toContain('>U<');
  });

  it('avatar button has correct aria attributes', async () => {
    const { Topbar } = await import('@/components/Topbar/Topbar');
    const html = renderHTML(createElement(Topbar, { breadcrumbs: [] }));
    expect(html).toContain('aria-label="User menu"');
    expect(html).toContain('aria-haspopup="true"');
  });

  it('renders search icon SVG', async () => {
    const { Topbar } = await import('@/components/Topbar/Topbar');
    const html = renderHTML(createElement(Topbar, { breadcrumbs: [] }));
    expect(html).toContain('<svg');
    expect(html).toContain('<circle');
  });
});

describe('Breadcrumbs (CSS Modules)', () => {
  it('renders with CSS Module classes instead of inline styles', async () => {
    const { Breadcrumbs } = await import('@/components/Breadcrumbs/Breadcrumbs');
    const segments = [{ label: 'Project', href: '/projects/p1' }];
    const html = renderHTML(createElement(Breadcrumbs, { segments }));
    expect(html).not.toContain('style=');
    expect(html).toContain('class=');
  });

  it('returns null for empty segments', async () => {
    const { Breadcrumbs } = await import('@/components/Breadcrumbs/Breadcrumbs');
    const html = renderHTML(createElement(Breadcrumbs, { segments: [] }));
    expect(html).toBe('');
  });

  it('marks last segment as current page', async () => {
    const { Breadcrumbs } = await import('@/components/Breadcrumbs/Breadcrumbs');
    const segments = [
      { label: 'Home', href: '/a' },
      { label: 'Current', href: '/b' },
    ];
    const html = renderHTML(createElement(Breadcrumbs, { segments }));
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Current');
  });
});
