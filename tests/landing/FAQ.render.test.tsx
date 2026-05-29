// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FAQ } from '@/components/landing/FAQ';

describe('<FAQ />', () => {
  it('renders the section with three FAQ entries, the first one open', () => {
    const { container, getByText } = render(<FAQ />);

    expect(container.querySelector('section#faq')).not.toBeNull();
    expect(getByText(/Frequently asked/)).toBeTruthy();
    expect(getByText(/The questions reviewers always ask\./)).toBeTruthy();

    const details = container.querySelectorAll('details');
    expect(details.length).toBe(3);

    const questions = Array.from(container.querySelectorAll('summary')).map(
      (el) => el.textContent ?? '',
    );
    expect(questions).toEqual([
      'Does it work without an LLM?',
      'Why SQLite instead of Postgres?',
      'Can I use it with Claude Code / Cursor / Aider?',
    ]);

    // First entry is the one marked `open`
    expect((details[0] as HTMLDetailsElement).open).toBe(true);
    expect((details[1] as HTMLDetailsElement).open).toBe(false);
    expect((details[2] as HTMLDetailsElement).open).toBe(false);

    // The removed "pin coordinates" question must not appear
    expect(
      Array.from(container.querySelectorAll('summary')).some((s) =>
        (s.textContent ?? '').includes('pin coordinates'),
      ),
    ).toBe(false);
  });
});
