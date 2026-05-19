import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

describe('NewProjectDialog SSR', () => {
  it('renders dialog scrim when open=true', async () => {
    const { NewProjectDialog } = await import('@/components/NewProjectDialog/NewProjectDialog');
    const html = renderToStaticMarkup(
      createElement(NewProjectDialog, {
        open: true,
        onClose: vi.fn(),
        onSaved: vi.fn(),
      }),
    );
    expect(html).toContain('dialog');
  });

  it('renders nothing when open=false', async () => {
    const { NewProjectDialog } = await import('@/components/NewProjectDialog/NewProjectDialog');
    const html = renderToStaticMarkup(
      createElement(NewProjectDialog, {
        open: false,
        onClose: vi.fn(),
        onSaved: vi.fn(),
      }),
    );
    expect(html).toBe('');
  });

  it('renders project name input', async () => {
    const { NewProjectDialog } = await import('@/components/NewProjectDialog/NewProjectDialog');
    const html = renderToStaticMarkup(
      createElement(NewProjectDialog, {
        open: true,
        onClose: vi.fn(),
        onSaved: vi.fn(),
      }),
    );
    expect(html).toContain('Project name');
    expect(html).toContain('input');
  });

  it('renders Cancel and Create buttons', async () => {
    const { NewProjectDialog } = await import('@/components/NewProjectDialog/NewProjectDialog');
    const html = renderToStaticMarkup(
      createElement(NewProjectDialog, {
        open: true,
        onClose: vi.fn(),
        onSaved: vi.fn(),
      }),
    );
    expect(html).toContain('Cancel');
    // Primary action is just "Create" / "Update" now — the noun is
    // redundant alongside the dialog title.
    expect(html).toContain('>Create<');
  });

  it('renders IconPicker inside dialog', async () => {
    const { NewProjectDialog } = await import('@/components/NewProjectDialog/NewProjectDialog');
    const html = renderToStaticMarkup(
      createElement(NewProjectDialog, {
        open: true,
        onClose: vi.fn(),
        onSaved: vi.fn(),
      }),
    );
    // IconPicker renders tabs: Code, Brands, UI, Emoji
    expect(html).toContain('Code');
    expect(html).toContain('Brands');
  });

  it('renders icon search input inside the dialog', async () => {
    const { NewProjectDialog } = await import('@/components/NewProjectDialog/NewProjectDialog');
    const html = renderToStaticMarkup(
      createElement(NewProjectDialog, {
        open: true,
        onClose: vi.fn(),
        onSaved: vi.fn(),
      }),
    );
    expect(html).toContain('Search icons');
  });

  it('does not render "Browse all icons" link', async () => {
    const { NewProjectDialog } = await import('@/components/NewProjectDialog/NewProjectDialog');
    const html = renderToStaticMarkup(
      createElement(NewProjectDialog, {
        open: true,
        onClose: vi.fn(),
        onSaved: vi.fn(),
      }),
    );
    expect(html).not.toContain('Browse all icons');
  });
});
