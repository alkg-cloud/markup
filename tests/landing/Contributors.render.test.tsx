// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Contributors } from '@/components/landing/Contributors';

function mockFetch(payload: unknown, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: async () => payload,
  }) as unknown as typeof fetch;
}

const user = (login: string) => ({
  login,
  type: 'User' as const,
  avatar_url: `https://avatars.example/${login}`,
  contributions: 5,
});

describe('<Contributors />', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing visible when <3 real contributors', async () => {
    mockFetch([
      user('AlexandreCamillo'),
      { login: 'dependabot[bot]', type: 'Bot', avatar_url: 'x', contributions: 1 },
    ]);
    const { container } = render(<Contributors />);
    // Wait for the fetch effect to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('.has-contributors')).toBeNull();
  });

  it('renders up to 4 avatars plus +N overflow when >=3 real', async () => {
    mockFetch([
      user('AlexandreCamillo'),
      user('jane'),
      user('mike'),
      user('sara'),
      user('paul'),
      user('claude-code'), // filtered out
    ]);
    const { container } = render(<Contributors />);
    await waitFor(() => {
      expect(screen.getAllByRole('img').length).toBe(4);
    });
    expect(screen.getByText('+1')).toBeTruthy();
    expect(container.querySelector('.has-contributors')).not.toBeNull();
  });

  it('stays hidden on fetch failure', async () => {
    mockFetch({}, false);
    const { container } = render(<Contributors />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('.has-contributors')).toBeNull();
  });
});
