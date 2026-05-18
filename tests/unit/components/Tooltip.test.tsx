// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Tooltip } from '@/components/Tooltip/Tooltip';

describe('Tooltip', () => {
  it('decorates the wrapped child with data-tooltip', () => {
    const html = renderToStaticMarkup(
      <Tooltip label="Hello">
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    expect(html).toContain('data-tooltip="Hello"');
    expect(html).toContain('Trigger');
  });

  it('omits data-tooltip-align when align is default (left)', () => {
    const html = renderToStaticMarkup(
      <Tooltip label="x">
        <button type="button">btn</button>
      </Tooltip>,
    );
    expect(html).not.toContain('data-tooltip-align');
  });

  it('adds data-tooltip-align="center" when align="center"', () => {
    const html = renderToStaticMarkup(
      <Tooltip label="x" align="center">
        <button type="button">btn</button>
      </Tooltip>,
    );
    expect(html).toContain('data-tooltip-align="center"');
  });

  it('adds data-tooltip-align="right" when align="right"', () => {
    const html = renderToStaticMarkup(
      <Tooltip label="x" align="right">
        <button type="button">btn</button>
      </Tooltip>,
    );
    expect(html).toContain('data-tooltip-align="right"');
  });

  it('wraps non-element children in a span', () => {
    const html = renderToStaticMarkup(<Tooltip label="text-only">text-only label</Tooltip>);
    expect(html).toContain('<span data-tooltip="text-only"');
  });
});
