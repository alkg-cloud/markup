import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('design tokens', () => {
  const css = readFileSync(path.resolve(__dirname, '../../src/styles/tokens.css'), 'utf-8');

  describe('glass surface tokens', () => {
    it('exposes --surface-glass-bg', () => {
      expect(css).toMatch(/--surface-glass-bg:\s*rgb\(7\s+12\s+15\s+\/\s+80%\)/);
    });
    it('exposes --surface-glass-blur', () => {
      expect(css).toMatch(/--surface-glass-blur:\s*blur\(16px\)\s+saturate\(140%\)/);
    });
    it('exposes --surface-glass-border', () => {
      expect(css).toMatch(/--surface-glass-border:\s*1px\s+solid\s+var\(--border\)/);
    });
  });

  describe('rail width tokens', () => {
    it('exposes --rail-width-collapsed', () => {
      expect(css).toMatch(/--rail-width-collapsed:\s*60px/);
    });
    it('exposes --rail-width-expanded', () => {
      expect(css).toMatch(/--rail-width-expanded:\s*300px/);
    });
  });

  describe('motion tokens (existing, verify still present)', () => {
    it('exposes --motion-fast', () => {
      expect(css).toMatch(/--motion-fast:\s*160ms/);
    });
    it('exposes --motion-base', () => {
      expect(css).toMatch(/--motion-base:\s*220ms/);
    });
    it('exposes --motion-slow', () => {
      expect(css).toMatch(/--motion-slow:\s*\d+ms/);
    });
  });
});
