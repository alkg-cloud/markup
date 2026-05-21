// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Kbd } from '@/components/Kbd/Kbd';

describe('Kbd', () => {
  it('renders keycap chips for each key token', () => {
    const html = renderToStaticMarkup(<Kbd keys={['mod', 'k']} />);
    // Should contain at least one <kbd> element
    expect(html).toContain('<kbd');
  });

  it('renders a group with aria-label for screen readers', () => {
    const html = renderToStaticMarkup(<Kbd keys={['mod', 'k']} />);
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label=');
  });

  it('renders aria-label starting with "shortcut:"', () => {
    const html = renderToStaticMarkup(<Kbd keys={['mod', 'k']} />);
    expect(html).toContain('aria-label="shortcut:');
  });

  it('individual keycap chips are aria-hidden', () => {
    const html = renderToStaticMarkup(<Kbd keys={['mod', 'k']} />);
    expect(html).toContain('aria-hidden="true"');
  });

  it('disabled prop sets data-state="disabled" on the group', () => {
    const html = renderToStaticMarkup(<Kbd keys={['mod', 'k']} disabled />);
    expect(html).toContain('data-state="disabled"');
  });

  it('Kbd.Key renders a <kbd> chip', () => {
    const html = renderToStaticMarkup(
      <Kbd.Group aria-label="test">
        <Kbd.Key>↑↓</Kbd.Key>
      </Kbd.Group>,
    );
    expect(html).toContain('<kbd');
    expect(html).toContain('↑↓');
  });

  it('Kbd.Group renders with aria-label', () => {
    const html = renderToStaticMarkup(
      <Kbd.Group aria-label="up/down arrows">
        <Kbd.Key>↑↓</Kbd.Key>
      </Kbd.Group>,
    );
    expect(html).toContain('aria-label="up/down arrows"');
    expect(html).toContain('role="group"');
  });

  it('renders multiple keys', () => {
    const html = renderToStaticMarkup(<Kbd keys={['mod', 'shift', 'n']} />);
    // At least 3 <kbd> elements for mod, shift, n
    const kbdCount = (html.match(/<kbd/g) || []).length;
    expect(kbdCount).toBeGreaterThanOrEqual(3);
  });

  it('className prop is passed through', () => {
    const html = renderToStaticMarkup(<Kbd keys={['mod', 'k']} className="my-class" />);
    expect(html).toContain('my-class');
  });
});
