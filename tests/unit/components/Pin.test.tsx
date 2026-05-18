// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Pin } from '@/components/Pin/Pin';

describe('Pin', () => {
  it('renders a button with the label', () => {
    const html = renderToStaticMarkup(<Pin annotationId="a1" colorIndex={0} label={1} />);
    expect(html).toContain('<button');
    expect(html).toContain('<span>1</span>');
  });

  it('exposes data-annotation-id and data-color', () => {
    const html = renderToStaticMarkup(<Pin annotationId="a42" colorIndex={9} label={42} />);
    expect(html).toContain('data-annotation-id="a42"');
    expect(html).toContain('data-color="9"');
  });

  it('falls back to padded aria-label when no tooltip provided', () => {
    const html = renderToStaticMarkup(<Pin annotationId="a1" colorIndex={0} label={1} />);
    expect(html).toContain('aria-label="Annotation #001"');
  });

  it('uses tooltip prop for aria-label + data-tooltip', () => {
    const html = renderToStaticMarkup(
      <Pin annotationId="a1" colorIndex={0} label={1} tooltip="Custom tip" />,
    );
    expect(html).toContain('aria-label="Custom tip"');
    expect(html).toContain('data-tooltip="Custom tip"');
  });

  it('applies the active class for status="active"', () => {
    const html = renderToStaticMarkup(
      <Pin annotationId="a1" colorIndex={0} label={1} status="active" />,
    );
    // CSS modules hash class names; verify by matching the substring
    expect(html).toMatch(/class="[^"]*active[^"]*"/);
  });

  it('applies the pending class for status="pending"', () => {
    const html = renderToStaticMarkup(
      <Pin annotationId="a1" colorIndex={0} label={1} status="pending" />,
    );
    expect(html).toMatch(/class="[^"]*pending[^"]*"/);
  });
});
