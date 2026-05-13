import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

describe('NewProjectDialog (SSR)', () => {
  it('renders nothing when closed', async () => {
    const { NewProjectDialog } = await import('@/components/NewProjectDialog/NewProjectDialog');
    const html = renderToStaticMarkup(
      createElement(NewProjectDialog, {
        open: false,
        onClose: () => {},
        onCreated: () => {},
      }),
    );
    expect(html).toBe('');
  });

  it('renders dialog with title when open', async () => {
    const { NewProjectDialog } = await import('@/components/NewProjectDialog/NewProjectDialog');
    const html = renderToStaticMarkup(
      createElement(NewProjectDialog, {
        open: true,
        onClose: () => {},
        onCreated: () => {},
      }),
    );
    expect(html).toContain('New Project');
  });

  it('renders Project name field', async () => {
    const { NewProjectDialog } = await import('@/components/NewProjectDialog/NewProjectDialog');
    const html = renderToStaticMarkup(
      createElement(NewProjectDialog, {
        open: true,
        onClose: () => {},
        onCreated: () => {},
      }),
    );
    expect(html).toContain('Project name');
  });

  it('renders Icon field with IconPicker tabs', async () => {
    const { NewProjectDialog } = await import('@/components/NewProjectDialog/NewProjectDialog');
    const html = renderToStaticMarkup(
      createElement(NewProjectDialog, {
        open: true,
        onClose: () => {},
        onCreated: () => {},
      }),
    );
    expect(html).toContain('Icon');
    expect(html).toContain('Code');
  });

  it('renders Cancel and Create project buttons', async () => {
    const { NewProjectDialog } = await import('@/components/NewProjectDialog/NewProjectDialog');
    const html = renderToStaticMarkup(
      createElement(NewProjectDialog, {
        open: true,
        onClose: () => {},
        onCreated: () => {},
      }),
    );
    expect(html).toContain('Cancel');
    expect(html).toContain('Create project');
  });

  it('Create project button is disabled (name empty on initial render)', async () => {
    const { NewProjectDialog } = await import('@/components/NewProjectDialog/NewProjectDialog');
    const html = renderToStaticMarkup(
      createElement(NewProjectDialog, {
        open: true,
        onClose: () => {},
        onCreated: () => {},
      }),
    );
    expect(html).toContain('disabled');
  });
});
