import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

describe('PICKER_ICONS data', () => {
  it('has all four tabs with entries', async () => {
    const { PICKER_ICONS, ICON_TABS } = await import('@/components/IconPicker/icons');
    expect(ICON_TABS).toHaveLength(4);
    expect(ICON_TABS.map((t) => t.key)).toEqual(['code', 'brands', 'ui', 'emoji']);
    expect(PICKER_ICONS.code.length).toBeGreaterThan(0);
    expect(PICKER_ICONS.brands.length).toBeGreaterThan(0);
    expect(PICKER_ICONS.ui.length).toBeGreaterThan(0);
    expect(PICKER_ICONS.emoji.length).toBeGreaterThan(0);
  });

  it('all tokens are non-empty strings', async () => {
    const { PICKER_ICONS } = await import('@/components/IconPicker/icons');
    for (const entries of Object.values(PICKER_ICONS)) {
      for (const entry of entries) {
        expect(typeof entry.token).toBe('string');
        expect(entry.token.length).toBeGreaterThan(0);
      }
    }
  });

  it('emoji entries have label, non-emoji entries have svg', async () => {
    const { PICKER_ICONS } = await import('@/components/IconPicker/icons');
    for (const entry of PICKER_ICONS.emoji) {
      expect(entry.token).toMatch(/^emoji:/);
      expect(typeof entry.label).toBe('string');
    }
    for (const entry of PICKER_ICONS.code) {
      expect(typeof entry.svg).toBe('string');
      expect(entry.svg).toContain('<svg');
    }
  });
});

describe('IconPicker (SSR)', () => {
  it('renders all four tab labels', async () => {
    const { IconPicker } = await import('@/components/IconPicker/IconPicker');
    const html = renderToStaticMarkup(createElement(IconPicker, { onSelect: () => {} }));
    expect(html).toContain('Code');
    expect(html).toContain('Brands');
    expect(html).toContain('UI');
    expect(html).toContain('Emoji');
  });

  it('renders search input', async () => {
    const { IconPicker } = await import('@/components/IconPicker/IconPicker');
    const html = renderToStaticMarkup(createElement(IconPicker, { onSelect: () => {} }));
    expect(html).toContain('Search icons');
  });

  it('shows selected token in footer', async () => {
    const { IconPicker } = await import('@/components/IconPicker/IconPicker');
    const html = renderToStaticMarkup(
      createElement(IconPicker, { value: 'vsc:VscFile', onSelect: () => {} }),
    );
    expect(html).toContain('vsc:VscFile');
  });

  it('shows "No icon selected" when no value', async () => {
    const { IconPicker } = await import('@/components/IconPicker/IconPicker');
    const html = renderToStaticMarkup(createElement(IconPicker, { onSelect: () => {} }));
    expect(html).toContain('No icon selected');
  });

  it('renders grid cells with aria-label matching token', async () => {
    const { IconPicker } = await import('@/components/IconPicker/IconPicker');
    const html = renderToStaticMarkup(createElement(IconPicker, { onSelect: () => {} }));
    expect(html).toContain('aria-label="vsc:VscFile"');
  });
});
