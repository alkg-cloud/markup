// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AnnotationComposer } from '@/components/AnnotationComposer/AnnotationComposer';
import { MarkingBar } from '@/components/MarkingBar/MarkingBar';

describe('AnnotationComposer', () => {
  it('hidden when open=false', () => {
    const html = renderToStaticMarkup(
      <AnnotationComposer
        open={false}
        marking={false}
        pendingPins={[]}
        onEnterMarking={vi.fn()}
        onCancel={vi.fn()}
        onPost={vi.fn()}
      />,
    );
    // not "open" class
    expect(html).not.toMatch(/class="[^"]*\bopen\b[^"]*"/);
  });

  it('renders the New annotation title (rename from "comment")', () => {
    const html = renderToStaticMarkup(
      <AnnotationComposer
        open
        marking={false}
        pendingPins={[]}
        onEnterMarking={vi.fn()}
        onCancel={vi.fn()}
        onPost={vi.fn()}
      />,
    );
    expect(html).toContain('New annotation');
    expect(html).not.toContain('New comment');
  });

  it('renders the Post annotation button (rename)', () => {
    const html = renderToStaticMarkup(
      <AnnotationComposer
        open
        marking={false}
        pendingPins={[]}
        onEnterMarking={vi.fn()}
        onCancel={vi.fn()}
        onPost={vi.fn()}
      />,
    );
    expect(html).toContain('Post annotation');
  });

  it('shows "Add pin" when no pending pins', () => {
    const html = renderToStaticMarkup(
      <AnnotationComposer
        open
        marking={false}
        pendingPins={[]}
        onEnterMarking={vi.fn()}
        onCancel={vi.fn()}
        onPost={vi.fn()}
      />,
    );
    expect(html).toContain('Add pin');
    expect(html).toContain('No pin attached');
  });

  it('morphs to "Edit pin" when 1 pending pin', () => {
    const html = renderToStaticMarkup(
      <AnnotationComposer
        open
        marking={false}
        pendingPins={[{ path: ':scope>div', offsetX: 0.5, offsetY: 0.5 }]}
        onEnterMarking={vi.fn()}
        onCancel={vi.fn()}
        onPost={vi.fn()}
      />,
    );
    expect(html).toContain('Edit pin');
    expect(html).toContain('Pinned to 1 location');
  });

  it('morphs to "Edit pins" when 2+ pending pins', () => {
    const html = renderToStaticMarkup(
      <AnnotationComposer
        open
        marking={false}
        pendingPins={[
          { path: ':scope>div', offsetX: 0.5, offsetY: 0.5 },
          { path: ':scope>div', offsetX: 0.6, offsetY: 0.6 },
        ]}
        onEnterMarking={vi.fn()}
        onCancel={vi.fn()}
        onPost={vi.fn()}
      />,
    );
    expect(html).toContain('Edit pins');
    expect(html).toContain('Pinned to 2 locations');
  });

  it('applies marking class when marking=true', () => {
    const html = renderToStaticMarkup(
      <AnnotationComposer
        open
        marking
        pendingPins={[]}
        onEnterMarking={vi.fn()}
        onCancel={vi.fn()}
        onPost={vi.fn()}
      />,
    );
    expect(html).toMatch(/class="[^"]*marking[^"]*"/);
  });
});

describe('MarkingBar', () => {
  it('hidden when open=false', () => {
    const html = renderToStaticMarkup(<MarkingBar open={false} pinCount={0} />);
    expect(html).not.toMatch(/class="[^"]*\bopen\b[^"]*"/);
  });

  it('shows pin count with singular when 1', () => {
    const html = renderToStaticMarkup(<MarkingBar open pinCount={1} />);
    expect(html).toContain('1 pin');
    expect(html).not.toContain('1 pins');
  });

  it('shows pin count with plural when 2+', () => {
    const html = renderToStaticMarkup(<MarkingBar open pinCount={3} />);
    expect(html).toContain('3 pins');
  });
});
