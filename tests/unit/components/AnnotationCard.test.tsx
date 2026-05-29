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
        author="ALKG"
        date="12/05/2026 · 19:30"
        primary={PRIMARY}
        currentUser="ALKG"
      />,
    );
    expect(html).toContain('ALKG');
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

  it('readOnly hides the primary kebab', () => {
    const html = renderToStaticMarkup(
      <AnnotationCard
        annotationId="a1"
        label={1}
        colorIndex={0}
        status="open"
        author="A"
        date="—"
        primary={PRIMARY}
        currentUser="A"
        readOnly
      />,
    );
    expect(html).not.toContain('aria-label="Annotation actions"');
  });

  it('readOnly hides the reply form textarea', () => {
    const html = renderToStaticMarkup(
      <AnnotationCard
        annotationId="a1"
        label={1}
        colorIndex={0}
        status="open"
        author="A"
        date="—"
        primary={PRIMARY}
        currentUser="A"
        readOnly
      />,
    );
    expect(html).not.toContain('Reply to this annotation…');
  });

  it('readOnly cascades to inner Comment (no Add reaction)', () => {
    const html = renderToStaticMarkup(
      <AnnotationCard
        annotationId="a1"
        label={1}
        colorIndex={0}
        status="open"
        author="A"
        date="—"
        primary={PRIMARY}
        currentUser="A"
        readOnly
      />,
    );
    expect(html).not.toContain('Add reaction');
  });

  it('readOnly cascades to reply Comments (no Add reaction on replies)', () => {
    const html = renderToStaticMarkup(
      <AnnotationCard
        annotationId="a1"
        label={1}
        colorIndex={0}
        status="open"
        author="A"
        date="—"
        primary={PRIMARY}
        replies={[
          { id: 'cmt-2', author: 'B', authorColorIndex: 1, timestamp: '—', body: 'reply 1' },
        ]}
        currentUser="A"
        readOnly
      />,
    );
    // Replies should render
    expect(html).toContain('reply 1');
    // No Add reaction trigger should appear anywhere in the card (primary OR reply)
    expect(html).not.toContain('Add reaction');
    // No kebab on reply ("More actions" is the Comment.tsx kebab tooltip)
    expect(html).not.toContain('aria-label="More actions"');
  });

  it('readOnly still renders the thread accordion toggle', () => {
    const html = renderToStaticMarkup(
      <AnnotationCard
        annotationId="a1"
        label={1}
        colorIndex={0}
        status="open"
        author="A"
        date="—"
        primary={PRIMARY}
        currentUser="A"
        readOnly
      />,
    );
    expect(html).toContain('aria-expanded=');
  });
});
