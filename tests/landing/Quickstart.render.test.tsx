// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Quickstart } from '@/components/landing/Quickstart';

describe('<Quickstart />', () => {
  it('renders the section with the docker code card and copy button', () => {
    const { container, getByText, getByRole } = render(<Quickstart />);

    expect(container.querySelector('section#quickstart')).not.toBeNull();
    expect(getByText(/Quickstart/)).toBeTruthy();
    expect(getByText(/Run it in 30 seconds\./)).toBeTruthy();

    // Exactly one code card (the agent-loop curl card was removed)
    const filenames = Array.from(container.querySelectorAll('section#quickstart span'))
      .map((el) => el.textContent ?? '')
      .filter((t) => t === '~/markup/start.sh');
    expect(filenames.length).toBe(1);

    // Copy button is rendered
    expect(getByRole('button', { name: /Copy/i })).toBeTruthy();

    // Docker command body is reachable in the rendered output
    const preText = container.querySelector('pre')?.textContent ?? '';
    expect(preText).toContain('docker run -d');
    expect(preText).toContain('AUTH_SECRET');
    expect(preText).toContain('ghcr.io/alkg-cloud/markup');
  });
});
