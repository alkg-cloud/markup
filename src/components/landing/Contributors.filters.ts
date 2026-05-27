export type ContributorLike = {
  login: string;
  type: 'User' | 'Bot';
};

export const BOT_PATTERNS: RegExp[] = [
  /\[bot\]$/i,
  /-bot$/i,
  /^github-actions/i,
  /^dependabot/i,
  /^renovate/i,
  /^snyk-/i,
  /^imgbot/i,
  /^claude/i,
  /^cursor/i,
  /^aider/i,
  /^copilot/i,
  /^anthropic/i,
  /-ai$/i,
  /-agent$/i,
];

export function isBotOrAI(c: ContributorLike): boolean {
  if (c.type === 'Bot') return true;
  return BOT_PATTERNS.some((p) => p.test(c.login));
}
