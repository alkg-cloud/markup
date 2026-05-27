export type CoverageMetrics = {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
};

export type CompareResult = {
  pass: boolean;
  failures: string[];
  deltas: CoverageMetrics;
  markdown: string;
  color: string;
};

const METRIC_KEYS: (keyof CoverageMetrics)[] = ['lines', 'statements', 'functions', 'branches'];

const LABEL: Record<keyof CoverageMetrics, string> = {
  lines: 'Lines',
  statements: 'Statements',
  functions: 'Functions',
  branches: 'Branches',
};

export function pickColor(linesPct: number): string {
  if (linesPct >= 80) return 'brightgreen';
  if (linesPct >= 70) return 'yellowgreen';
  if (linesPct >= 60) return 'yellow';
  if (linesPct >= 50) return 'orange';
  return 'red';
}

export function compareCoverage(
  current: CoverageMetrics,
  baseline: CoverageMetrics | null,
  driftTolerance: number,
): CompareResult {
  const effectiveBaseline: CoverageMetrics = baseline ?? {
    lines: 0,
    statements: 0,
    functions: 0,
    branches: 0,
  };
  const deltas: CoverageMetrics = {
    lines: round(current.lines - effectiveBaseline.lines),
    statements: round(current.statements - effectiveBaseline.statements),
    functions: round(current.functions - effectiveBaseline.functions),
    branches: round(current.branches - effectiveBaseline.branches),
  };
  const failures = METRIC_KEYS.filter((k) => deltas[k] < -driftTolerance);

  const rows = METRIC_KEYS.map((k) => {
    const baseStr = baseline === null ? '—' : `${effectiveBaseline[k].toFixed(2)}%`;
    const curStr = `${current[k].toFixed(2)}%`;
    const delta = deltas[k];
    const sign = delta > 0 ? '+' : '';
    const flag = failures.includes(k) ? ' ❌' : '';
    return `| ${LABEL[k]} | ${baseStr} | ${curStr} | ${sign}${delta.toFixed(2)}${flag} |`;
  }).join('\n');

  const markdown = [
    '<!-- coverage-ratchet -->',
    '',
    '### Coverage report',
    '',
    '| Metric | Baseline (main) | This PR | Δ |',
    '|---|---|---|---|',
    rows,
    '',
  ].join('\n');

  return {
    pass: failures.length === 0,
    failures,
    deltas,
    markdown,
    color: pickColor(current.lines),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
