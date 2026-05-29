// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DesignFeatureFlow } from '@/components/landing/DesignFeatureFlow';

describe('<DesignFeatureFlow />', () => {
  it('renders the section with eyebrow, headline, lead, and repo CTA', () => {
    const { container, getByText, getByRole } = render(<DesignFeatureFlow />);

    expect(container.querySelector('section#design-loop')).not.toBeNull();
    expect(getByText(/Pair Markup with a skill/)).toBeTruthy();
    expect(getByText(/Lock the design before you discuss the build\./)).toBeTruthy();

    const repoLink = getByRole('link', { name: /alkg-cloud\/design-skills/i });
    expect(repoLink.getAttribute('href')).toBe('https://github.com/alkg-cloud/design-skills');
    expect(repoLink.getAttribute('target')).toBe('_blank');
    expect(repoLink.getAttribute('rel')).toContain('noopener');
  });

  it('renders all six phase cards in order (00..05)', () => {
    const { container } = render(<DesignFeatureFlow />);
    const items = container.querySelectorAll('ol > li');
    expect(items.length).toBe(6);
    const indices = Array.from(items).map(
      (li) => li.querySelector('[aria-hidden="true"]')?.textContent,
    );
    expect(indices).toEqual(['00', '01', '02', '03', '04', '05']);
  });

  it('renders boost callouts only for phases 01, 02, 03', () => {
    const { container } = render(<DesignFeatureFlow />);
    const items = container.querySelectorAll('ol > li');
    // boost is the last child in cards that have one; absent in others
    const withBoost: string[] = [];
    items.forEach((li) => {
      const ix = li.querySelector('[aria-hidden="true"]')?.textContent;
      // any direct child whose text starts with "With Markup," is the boost
      const hasBoost = Array.from(li.children).some((c) =>
        (c.textContent ?? '').startsWith('With Markup'),
      );
      if (hasBoost && ix) withBoost.push(ix);
    });
    expect(withBoost).toEqual(['01', '02', '03']);
  });

  it('renders the closing coda paragraph', () => {
    const { container } = render(<DesignFeatureFlow />);
    // The coda has inline <code> elements that split text nodes, so we
    // assert against the concatenated text of the last <p> in the section.
    const paragraphs = container.querySelectorAll('p');
    const codaText = paragraphs[paragraphs.length - 1]?.textContent;
    expect(codaText).toContain('leaves an addressable trail');
  });
});
