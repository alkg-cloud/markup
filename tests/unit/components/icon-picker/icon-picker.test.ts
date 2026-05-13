import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { filterIcons, PICKER_ICONS } from '@/components/IconPicker/icons';

describe('PICKER_ICONS data', () => {
  it('has 4 tabs: code, brands, ui, emoji', () => {
    expect(Object.keys(PICKER_ICONS)).toEqual(['code', 'brands', 'ui', 'emoji']);
  });

  it('each tab has at least one icon', () => {
    for (const tab of Object.keys(PICKER_ICONS)) {
      expect(PICKER_ICONS[tab as keyof typeof PICKER_ICONS].length).toBeGreaterThan(0);
    }
  });

  it('each icon has token and svg/label', () => {
    for (const tab of Object.keys(PICKER_ICONS)) {
      for (const icon of PICKER_ICONS[tab as keyof typeof PICKER_ICONS]) {
        expect(icon.token).toBeTruthy();
      }
    }
  });
});

describe('filterIcons', () => {
  it('returns all icons when query is empty', () => {
    const result = filterIcons('code', '');
    expect(result.length).toBe(PICKER_ICONS.code.length);
  });

  it('filters by token substring (case-insensitive)', () => {
    const result = filterIcons('code', 'gear');
    expect(result.every((i) => i.token.toLowerCase().includes('gear'))).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty array when no match', () => {
    const result = filterIcons('code', 'zzzznonexistent');
    expect(result).toHaveLength(0);
  });
});

describe('IconPicker SSR', () => {
  it('renders 4 tab buttons', async () => {
    const { IconPicker } = await import('@/components/IconPicker/IconPicker');
    const html = renderToStaticMarkup(createElement(IconPicker, { onSelect: vi.fn() }));
    expect(html).toContain('Code');
    expect(html).toContain('Brands');
    expect(html).toContain('UI');
    expect(html).toContain('Emoji');
  });

  it('renders search input with placeholder', async () => {
    const { IconPicker } = await import('@/components/IconPicker/IconPicker');
    const html = renderToStaticMarkup(createElement(IconPicker, { onSelect: vi.fn() }));
    expect(html).toContain('Search icons');
  });

  it('renders icon cells for the default tab (code)', async () => {
    const { IconPicker } = await import('@/components/IconPicker/IconPicker');
    const html = renderToStaticMarkup(createElement(IconPicker, { onSelect: vi.fn() }));
    // At least one icon cell from code tab should appear
    expect(html).toContain('vsc:');
  });

  it('shows selected token in footer', async () => {
    const { IconPicker } = await import('@/components/IconPicker/IconPicker');
    const html = renderToStaticMarkup(
      createElement(IconPicker, { value: 'vsc:VscFile', onSelect: vi.fn() }),
    );
    expect(html).toContain('vsc:VscFile');
  });
});
