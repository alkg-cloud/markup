// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HistoricBanner } from '@/components/HistoricBanner/HistoricBanner';

describe('HistoricBanner', () => {
  it('renders the viewing label', () => {
    const html = renderToStaticMarkup(
      <HistoricBanner viewingLabel="v2" currentLabel="v5" onExit={() => {}} />,
    );
    expect(html).toContain('Viewing v2');
  });

  it('renders the exit button with current label', () => {
    const html = renderToStaticMarkup(
      <HistoricBanner viewingLabel="v2" currentLabel="v5" onExit={() => {}} />,
    );
    expect(html).toContain('Back to v5 (current)');
  });

  it('marks the outer wrapper as role=status with aria-live=polite', () => {
    const html = renderToStaticMarkup(
      <HistoricBanner viewingLabel="v2" currentLabel="v5" onExit={() => {}} />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it('exit button has a tooltip and aria-label', () => {
    const html = renderToStaticMarkup(
      <HistoricBanner viewingLabel="v2" currentLabel="v5" onExit={() => {}} />,
    );
    expect(html).toContain('data-tooltip="Back to current version"');
    expect(html).toContain('aria-label="Back to current version"');
  });
});
