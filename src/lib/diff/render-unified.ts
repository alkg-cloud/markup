import { createTwoFilesPatch } from 'diff';

export function renderUnifiedDiff(a: string, aLabel: string, b: string, bLabel: string): string {
  if (a === b) return '';
  // createTwoFilesPatch prefixes a "===..." separator line; strip it so the
  // output is conventional unified-diff parseable by `patch`/`git apply`.
  const raw = createTwoFilesPatch(aLabel, bLabel, a, b, '', '', { context: 3 });
  return raw.replace(/^=+\n/, '');
}
