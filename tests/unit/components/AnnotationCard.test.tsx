// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnnotationCard } from '@/components/AnnotationCard/AnnotationCard';

const PRIMARY = {
  id: 'cmt-1',
  author: 'Alexandre',
  authorColorIndex: 0,
  isOwn: true,
  timestamp: '12/05 · 19:30',
  body: 'Headline kerning too tight at this size.',
};

describe('AnnotationCard', () => {
  it('renders the meta row with badge, author, status pill', () => {
    const html = renderToStaticMarkup(
      <AnnotationCard
        annotationId="a1"
        label={1}
        colorIndex={0}
        status="open"
        author="Alexandre Camillo"
        date="12/05/2026 · 19:30"
        primary={PRIMARY}
        currentUser="Alexandre"
      />,
    );
    expect(html).toContain('Alexandre Camillo');
    expect(html).toContain('>open<');
    expect(html).toContain('data-color="0"');
  });

  it('renders the primary comment as the card body', () => {
    const html = renderToStaticMarkup(
      <AnnotationCard
        annotationId="a1"
        label={1}
        colorIndex={0}
        status="open"
        author="Alexandre"
        date="—"
        primary={PRIMARY}
        currentUser="Alexandre"
      />,
    );
    expect(html).toContain('Headline kerning');
  });

  it('shows "1 reply" / "N replies" / "No replies"', () => {
    const html0 = renderToStaticMarkup(
      <AnnotationCard
        annotationId="a1"
        label={1}
        colorIndex={0}
        status="open"
        author="Alexandre"
        date="—"
        primary={PRIMARY}
        currentUser="Alexandre"
      />,
    );
    expect(html0).toContain('No replies');

    const html1 = renderToStaticMarkup(
      <AnnotationCard
        annotationId="a1"
        label={1}
        colorIndex={0}
        status="open"
        author="Alexandre"
        date="—"
        primary={PRIMARY}
        currentUser="Alexandre"
        replies={[{ ...PRIMARY, id: 'cmt-2', isOwn: false, author: 'Marina' }]}
      />,
    );
    expect(html1).toContain('1 reply');

    const html3 = renderToStaticMarkup(
      <AnnotationCard
        annotationId="a1"
        label={1}
        colorIndex={0}
        status="open"
        author="Alexandre"
        date="—"
        primary={PRIMARY}
        currentUser="Alexandre"
        replies={[
          { ...PRIMARY, id: 'cmt-2', isOwn: false, author: 'Marina' },
          { ...PRIMARY, id: 'cmt-3', isOwn: false, author: 'Sam' },
          { ...PRIMARY, id: 'cmt-4', isOwn: false, author: 'Diana' },
        ]}
      />,
    );
    expect(html3).toContain('3 replies');
  });

  it('applies status-specific pill class', () => {
    const open = renderToStaticMarkup(
      <AnnotationCard
        annotationId="a1"
        label={1}
        colorIndex={0}
        status="open"
        author="A"
        date="—"
        primary={PRIMARY}
        currentUser="Alexandre"
      />,
    );
    const resolved = renderToStaticMarkup(
      <AnnotationCard
        annotationId="a1"
        label={1}
        colorIndex={0}
        status="resolved"
        author="A"
        date="—"
        primary={PRIMARY}
        currentUser="Alexandre"
      />,
    );
    const review = renderToStaticMarkup(
      <AnnotationCard
        annotationId="a1"
        label={1}
        colorIndex={0}
        status="needs review"
        author="A"
        date="—"
        primary={PRIMARY}
        currentUser="Alexandre"
      />,
    );
    expect(open).toContain('>open<');
    expect(resolved).toContain('>resolved<');
    expect(review).toContain('>needs review<');
  });

  it('applies active class when active=true', () => {
    const html = renderToStaticMarkup(
      <AnnotationCard
        annotationId="a1"
        label={1}
        colorIndex={0}
        status="open"
        author="A"
        date="—"
        primary={PRIMARY}
        currentUser="Alexandre"
        active
      />,
    );
    expect(html).toMatch(/class="[^"]*active[^"]*"/);
  });
});
