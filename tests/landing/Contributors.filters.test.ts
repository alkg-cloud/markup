import { describe, expect, it } from 'vitest';
import { isBotOrAI } from '@/components/landing/Contributors.filters';

const c = (login: string, type: 'User' | 'Bot' = 'User') => ({ login, type });

describe('isBotOrAI', () => {
  it('flags GitHub Bot type', () => {
    expect(isBotOrAI(c('dependabot[bot]', 'Bot'))).toBe(true);
  });

  it('flags known AI / automation handle prefixes', () => {
    const bots = [
      'github-actions[bot]',
      'dependabot',
      'renovate-bot',
      'snyk-bot',
      'imgbot',
      'claude-code',
      'cursor-agent',
      'aider-bot',
      'copilot-bot',
      'anthropic-bot',
      'something-ai',
      'helper-agent',
    ];
    for (const login of bots) {
      expect(isBotOrAI(c(login))).toBe(true);
    }
  });

  it('keeps real human handles that resemble patterns', () => {
    // Each of these MUST be classified as human:
    const humans = [
      'AlexandreCamillo',
      'aiden', // doesn't end with -ai
      'agent-orange-fan', // doesn't end with -agent
      'octocat',
      'gh-actions-fan', // doesn't start with github-actions
    ];
    for (const login of humans) {
      expect(isBotOrAI(c(login))).toBe(false);
    }
  });

  it('accepts intentional false positives for usernames starting with AI keywords', () => {
    // We'd rather hide a "Claude Monet" fan than slip a Claude Code account through.
    // This documents the trade-off; if it ever needs to change, edit BOT_PATTERNS
    // and update this test.
    expect(isBotOrAI(c('claude-monet-93'))).toBe(true);
  });
});
