// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnnotationsRail } from '@/components/AnnotationsRail/AnnotationsRail';

describe('AnnotationsRail', () => {
  it('renders empty rail with no badges', () => {
    const html = renderToStaticMarkup(
      <AnnotationsRail badges={[]} />,
    );
    expect(html).toContain('aria-label="Annotations"');
    expect(html).toContain('No annotations yet');
  });

  it('renders one badge per annotation in collapsed view', () => {
    const html = renderToStaticMarkup(
      <AnnotationsRail
        badges={[
          { annotationId: 'a1', colorIndex: 0, label: 1 },
          { annotationId: 'a2', colorIndex: 9, label: 2 },
        ]}
      />,
    );
    expect(html).toContain('data-color="0"');
    expect(html).toContain('data-color="9"');
  });

  it('attaches per-badge tooltip in correct format', () => {
    const html = renderToStaticMarkup(
      <AnnotationsRail badges={[{ annotationId: 'a1', colorIndex: 0, label: 42 }]} />,
    );
    expect(html).toContain('data-tooltip="Open annotation #042"');
  });

  it('renders the expanded count badge from prop', () => {
    const html = renderToStaticMarkup(
      <AnnotationsRail
        badges={[{ annotationId: 'a1', colorIndex: 0, label: 1 }]}
        count={7}
      />,
    );
    // Count appears in the expanded header
    expect(html).toContain('>7</span>');
  });

  it('renders the Lock-open button with Keep expanded tooltip', () => {
    const html = renderToStaticMarkup(
      <AnnotationsRail badges={[]} />,
    );
    expect(html).toContain('data-tooltip="Keep expanded"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('renders the add-annotation button with New annotation label', () => {
    const html = renderToStaticMarkup(
      <AnnotationsRail badges={[]} />,
    );
    expect(html).toContain('aria-label="New annotation"');
    expect(html).toContain('New annotation');
  });

  it('renders provided expanded children inside the list', () => {
    const html = renderToStaticMarkup(
      <AnnotationsRail badges={[{ annotationId: 'a1', colorIndex: 0, label: 1 }]}>
        <li data-testid="card-a1">card 1</li>
      </AnnotationsRail>,
    );
    expect(html).toContain('card 1');
  });
});
