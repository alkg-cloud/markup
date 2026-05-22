// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('shortcuts/platform', () => {
  let originalNav: typeof navigator;

  beforeEach(() => {
    originalNav = global.navigator;
    vi.resetModules();
  });
  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNav,
      writable: true,
      configurable: true,
    });
    vi.resetModules();
  });

  function withPlatform(platform: string): Promise<typeof import('@/lib/shortcuts/platform')> {
    Object.defineProperty(global, 'navigator', {
      value: { platform, userAgent: platform } as Navigator,
      writable: true,
      configurable: true,
    });
    return import('@/lib/shortcuts/platform');
  }

  it('isMac returns true on macOS platform string', async () => {
    const mod = await withPlatform('MacIntel');
    expect(mod.isMac()).toBe(true);
  });

  it('isMac returns false on Win32', async () => {
    const mod = await withPlatform('Win32');
    expect(mod.isMac()).toBe(false);
  });

  it('isMod matches metaKey on mac', async () => {
    const mod = await withPlatform('MacIntel');
    const e = { metaKey: true, ctrlKey: false } as KeyboardEvent;
    expect(mod.isMod(e)).toBe(true);
    const e2 = { metaKey: false, ctrlKey: true } as KeyboardEvent;
    expect(mod.isMod(e2)).toBe(false);
  });

  it('isMod matches ctrlKey on non-mac', async () => {
    const mod = await withPlatform('Linux x86_64');
    const e = { metaKey: false, ctrlKey: true } as KeyboardEvent;
    expect(mod.isMod(e)).toBe(true);
    const e2 = { metaKey: true, ctrlKey: false } as KeyboardEvent;
    expect(mod.isMod(e2)).toBe(false);
  });

  it('formatShortcut produces ⌘⇧N when mac=true', async () => {
    const mod = await import('@/lib/shortcuts/platform');
    expect(mod.formatShortcut(['shift', 'n'], true)).toBe('⌘⇧N');
  });

  it('formatShortcut produces Ctrl+⇧+N when mac=false', async () => {
    const mod = await import('@/lib/shortcuts/platform');
    expect(mod.formatShortcut(['shift', 'n'], false)).toBe('Ctrl+⇧+N');
  });
});
