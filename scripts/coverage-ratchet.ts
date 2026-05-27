#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type CoverageMetrics, compareCoverage } from './lib/coverage-compare';

const DRIFT_TOLERANCE = 0.1;
const COVERAGE_BRANCH = 'coverage-data';
const COVERAGE_DIR = 'coverage';
const SCRATCH_DIR = '.coverage-data-clone';

type SummaryFile = {
  total: {
    lines: { pct: number };
    statements: { pct: number };
    functions: { pct: number };
    branches: { pct: number };
  };
};

function sh(cmd: string, opts: { cwd?: string; allowFail?: boolean } = {}): string {
  try {
    return execSync(cmd, { cwd: opts.cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  } catch (e) {
    if (opts.allowFail) return '';
    throw e;
  }
}

function readCurrentMetrics(): CoverageMetrics {
  const path = join(COVERAGE_DIR, 'coverage-summary.json');
  if (!existsSync(path)) throw new Error(`Missing ${path}. Did you run 'pnpm test --coverage'?`);
  const summary = JSON.parse(readFileSync(path, 'utf8')) as SummaryFile;
  return {
    lines: summary.total.lines.pct,
    statements: summary.total.statements.pct,
    functions: summary.total.functions.pct,
    branches: summary.total.branches.pct,
  };
}

function cloneCoverageBranch(): { exists: boolean } {
  rmSync(SCRATCH_DIR, { recursive: true, force: true });
  const out = sh(`git ls-remote --exit-code origin ${COVERAGE_BRANCH}`, { allowFail: true });
  if (!out.trim()) {
    mkdirSync(SCRATCH_DIR, { recursive: true });
    sh(`git init -q`, { cwd: SCRATCH_DIR });
    sh(`git checkout --orphan ${COVERAGE_BRANCH}`, { cwd: SCRATCH_DIR });
    return { exists: false };
  }
  sh(
    `git clone --branch ${COVERAGE_BRANCH} --single-branch --depth 1 ${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${process.env.GITHUB_REPOSITORY} ${SCRATCH_DIR}`,
  );
  return { exists: true };
}

function readBaseline(): CoverageMetrics | null {
  const path = join(SCRATCH_DIR, 'baseline.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as CoverageMetrics;
}

function writeArtifacts(current: CoverageMetrics, color: string): void {
  writeFileSync(join(SCRATCH_DIR, 'baseline.json'), JSON.stringify(current, null, 2));
  writeFileSync(
    join(SCRATCH_DIR, 'badge.json'),
    JSON.stringify(
      { schemaVersion: 1, label: 'coverage', message: `${Math.round(current.lines)}%`, color },
      null,
      2,
    ),
  );
  const reportDir = join(SCRATCH_DIR, 'report');
  rmSync(reportDir, { recursive: true, force: true });
  cpSync(COVERAGE_DIR, reportDir, { recursive: true });
  writeFileSync(
    join(SCRATCH_DIR, 'README.md'),
    '# coverage-data\n\nThis orphan branch holds coverage artifacts (baseline.json, badge.json, report/) for the Markup project. **Do not merge to main.** The branch is force-updated by CI on every push to main.\n',
  );
}

function pushArtifacts(): void {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN required to push coverage artifacts');
  const remote = `https://x-access-token:${token}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
  sh(
    `git -C ${SCRATCH_DIR} config user.email "41898282+github-actions[bot]@users.noreply.github.com"`,
  );
  sh(`git -C ${SCRATCH_DIR} config user.name "github-actions[bot]"`);
  sh(`git -C ${SCRATCH_DIR} add -A`);
  sh(
    `git -C ${SCRATCH_DIR} commit -m "chore(coverage): update baseline + badge for ${process.env.GITHUB_SHA?.slice(0, 7) ?? 'unknown'}"`,
    { allowFail: true },
  );
  sh(`git -C ${SCRATCH_DIR} push --force "${remote}" ${COVERAGE_BRANCH}`);
}

async function main(): Promise<void> {
  try {
    const current = readCurrentMetrics();
    const { exists } = cloneCoverageBranch();
    const baseline = exists ? readBaseline() : null;
    const result = compareCoverage(current, baseline, DRIFT_TOLERANCE);

    console.log(result.markdown);

    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (summaryPath) writeFileSync(summaryPath, result.markdown, { flag: 'a' });

    const outputPath = process.env.GITHUB_OUTPUT;
    if (outputPath) {
      writeFileSync(outputPath, `markdown<<EOF\n${result.markdown}\nEOF\npass=${result.pass}\n`, {
        flag: 'a',
      });
    }

    const isPush =
      process.env.GITHUB_EVENT_NAME === 'push' && process.env.GITHUB_REF_NAME === 'main';
    if (!result.pass) {
      console.error(`Coverage regressed in: ${result.failures.join(', ')}`);
      process.exit(1);
    }
    if (isPush) {
      writeArtifacts(current, result.color);
      pushArtifacts();
      console.log(`Coverage artifacts pushed to branch ${COVERAGE_BRANCH}.`);
    }
  } finally {
    // The scratch clone may hold a token-embedded remote URL in .git/config;
    // clean up even on failure paths so the secret never survives the process.
    rmSync(SCRATCH_DIR, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
