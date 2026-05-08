import { applyPatch } from 'diff';

export class DiffApplyError extends Error {
  constructor(public readonly reason: 'conflict' | 'malformed') {
    super(`diff_apply_failed:${reason}`);
    this.name = 'DiffApplyError';
  }
}

export function applyUnifiedDiff(source: string, patch: string): string {
  if (!patch || typeof patch !== 'string') {
    throw new DiffApplyError('malformed');
  }
  let result: string | false;
  try {
    result = applyPatch(source, patch);
  } catch {
    throw new DiffApplyError('malformed');
  }
  if (result === false) {
    throw new DiffApplyError('conflict');
  }
  return result;
}
