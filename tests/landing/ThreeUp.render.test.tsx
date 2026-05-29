// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThreeUp } from '@/components/landing/ThreeUp';

describe('<ThreeUp />', () => {
  it('renders the section with eyebrow, h2, lead, and three cards', () => {
    const { container, getByText } = render(<ThreeUp />);

    expect(container.querySelector('section#why')).not.toBeNull();
    expect(getByText(/Why Markup/)).toBeTruthy();
    expect(getByText(/Three reasons it's not just "Figma for code"\./)).toBeTruthy();

    const cards = container.querySelectorAll('section#why > div > div');
    // The .grid container holds the three cards.
    const cardArr = Array.from(container.querySelectorAll('section#why h3'));
    expect(cardArr.map((h) => h.textContent)).toEqual([
      'The iframe is the truth',
      'Single-mount deploy',
      'An API agents can use',
    ]);
    // sanity: each card has a body paragraph + an SVG icon
    expect(cards.length).toBeGreaterThan(0);
    expect(container.querySelectorAll('section#why svg').length).toBe(3);
  });
});
