import { describe, expect, it } from 'vitest';
import { type CoverageMetrics, compareCoverage } from '../../../scripts/lib/coverage-compare';

const DRIFT_TOLERANCE = 0.1;

const make = (
  lines: number,
  statements: number,
  functions: number,
  branches: number,
): CoverageMetrics => ({
  lines,
  statements,
  functions,
  branches,
});

describe('compareCoverage', () => {
  it('reports pass when current equals baseline', () => {
    const r = compareCoverage(make(70, 70, 70, 70), make(70, 70, 70, 70), DRIFT_TOLERANCE);
    expect(r.pass).toBe(true);
    expect(r.failures).toEqual([]);
  });

  it('reports pass when current is above baseline', () => {
    const r = compareCoverage(make(75, 75, 75, 75), make(70, 70, 70, 70), DRIFT_TOLERANCE);
    expect(r.pass).toBe(true);
    expect(r.deltas.lines).toBeCloseTo(5);
  });

  it('reports pass when current drops within tolerance', () => {
    const r = compareCoverage(make(69.95, 70, 70, 70), make(70, 70, 70, 70), DRIFT_TOLERANCE);
    expect(r.pass).toBe(true);
  });

  it('reports fail when any metric drops more than tolerance', () => {
    const r = compareCoverage(make(69.5, 70, 70, 70), make(70, 70, 70, 70), DRIFT_TOLERANCE);
    expect(r.pass).toBe(false);
    expect(r.failures).toContain('lines');
  });

  it('lists every failing metric', () => {
    const r = compareCoverage(make(60, 60, 70, 70), make(70, 70, 70, 70), DRIFT_TOLERANCE);
    expect(r.pass).toBe(false);
    expect(r.failures.sort()).toEqual(['lines', 'statements']);
  });

  it('formats a markdown table', () => {
    const r = compareCoverage(
      make(73.5, 73.4, 68.1, 64.4),
      make(73.42, 73.41, 68.1, 64.85),
      DRIFT_TOLERANCE,
    );
    expect(r.markdown).toContain('| Metric');
    expect(r.markdown).toContain('Lines');
    expect(r.markdown).toMatch(/-0\.45/);
  });

  it('treats a missing baseline as zero (first run)', () => {
    const r = compareCoverage(make(50, 50, 50, 50), null, DRIFT_TOLERANCE);
    expect(r.pass).toBe(true);
  });

  it('picks badge color from lines pct', () => {
    expect(compareCoverage(make(85, 0, 0, 0), null, DRIFT_TOLERANCE).color).toBe('brightgreen');
    expect(compareCoverage(make(72, 0, 0, 0), null, DRIFT_TOLERANCE).color).toBe('yellowgreen');
    expect(compareCoverage(make(62, 0, 0, 0), null, DRIFT_TOLERANCE).color).toBe('yellow');
    expect(compareCoverage(make(52, 0, 0, 0), null, DRIFT_TOLERANCE).color).toBe('orange');
    expect(compareCoverage(make(40, 0, 0, 0), null, DRIFT_TOLERANCE).color).toBe('red');
  });
});
