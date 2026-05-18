// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { buildAnchorPath, resolveAnchor } from '@/lib/anchoring/path';

describe('buildAnchorPath / resolveAnchor', () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root">
        <div class="a">
          <div class="b">
            <h1 class="c"><em>quiet</em> mornings.</h1>
          </div>
          <div class="d">art</div>
        </div>
      </div>
    `;
    root = document.getElementById('root')!;
  });

  it('returns null when target is the root', () => {
    expect(buildAnchorPath(root, root)).toBeNull();
  });

  it('returns null when target is null', () => {
    expect(buildAnchorPath(root, null)).toBeNull();
  });

  it('returns null when target is outside the root', () => {
    const outside = document.createElement('span');
    document.body.appendChild(outside);
    expect(buildAnchorPath(root, outside)).toBeNull();
  });

  it('builds a :scope-prefixed direct-child path', () => {
    const em = root.querySelector('em')!;
    expect(buildAnchorPath(root, em)).toBe(':scope>div>div:nth-of-type(1)>h1>em');
  });

  it('resolves the path back to the same element', () => {
    const em = root.querySelector('em')!;
    const path = buildAnchorPath(root, em)!;
    expect(resolveAnchor(root, path)).toBe(em);
  });

  it('uses nth-of-type only when siblings of same tag exist', () => {
    const d = root.querySelector('.d')!;
    expect(buildAnchorPath(root, d)).toBe(':scope>div>div:nth-of-type(2)');
  });

  it('resolves empty path to root (canvas background click)', () => {
    expect(resolveAnchor(root, '')).toBe(root);
    expect(resolveAnchor(root, null)).toBe(root);
    expect(resolveAnchor(root, undefined)).toBe(root);
  });

  it('returns null when path is invalid', () => {
    expect(resolveAnchor(root, ':::not a selector::')).toBeNull();
  });

  it('returns null when path no longer resolves (DOM changed)', () => {
    expect(resolveAnchor(root, ':scope>section>article')).toBeNull();
  });
});
