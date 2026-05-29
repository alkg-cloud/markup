# Quality Gate

Merges to `main` are gated by `@quality-gate/core` (upstream: [`alkg-cloud/quality-gate`](https://github.com/alkg-cloud/quality-gate), pinned commit `192fcaf386cf5bbb464dca53a26949078240c100`). The gate ratchets five metrics against a baseline stored on the orphan branch `quality-metrics` in this repo.

The upstream package is not published to npm. Both gate workflows clone the repo at the pinned commit and build the CLI on each run. To bump the pin, edit the SHA in both `.github/workflows/quality-gate-*.yml` files.

## Metrics and rules

| Metric | Source | Failure rule |
|---|---|---|
| `coverage` | `coverage/coverage-summary.json` from vitest (v8 provider) | Global `lines_pct` drops > `epsilon` (0.10pp) below baseline. New file with coverage below `MIN_NEW_FILE_COVERAGE` (60%) also blocks. |
| `lint` | `pnpm exec biome check . --reporter=json` | Total diagnostic count rises above baseline; OR any per-file count rises; OR any new file contributes ≥1 diagnostic. |
| `duplication` | `npx jscpd` | Global `pct` rises > `epsilon` above baseline. |
| `file_size` | `find src/ tests/` with line count | Existing file's line count rises above its baseline count (when already above `MAX_FILE_LINES`, currently 500). New file with `lines >= MAX_FILE_LINES` blocks. |
| `security` | `pnpm audit --json` | Any vulnerability in `block_severities` (currently `["critical"]`). `high` is a warning, not a block. |

## Config

`quality-gate.config.json` at repo root is the contract. Schema: [`config.schema.json`](https://raw.githubusercontent.com/alkg-cloud/quality-gate/main/src/schemas/config.schema.json).

## Adapter

`./.quality-gate/adapter.sh` produces the six canonical JSON files the engine consumes. It is project-specific (vitest + biome + jscpd + pnpm audit, not the upstream React template's jest + eslint + npm audit). Schemas at `https://github.com/alkg-cloud/quality-gate/tree/main/src/schemas`.

To run the adapter locally:

```bash
DATABASE_URL='file:./prisma/test.db' pnpm prisma migrate deploy
pnpm tsx tests/fixtures/build-fixtures.ts
pnpm test --coverage
mkdir -p /tmp/qg
QG_OUTPUT_DIR=/tmp/qg QG_CONFIG=./quality-gate.config.json ./.quality-gate/adapter.sh
ls /tmp/qg
```

To run the full engine locally (clone+build the upstream CLI yourself):

```bash
git clone --depth 1 https://github.com/alkg-cloud/quality-gate /tmp/qg-core
cd /tmp/qg-core && git checkout 192fcaf386cf5bbb464dca53a26949078240c100 && pnpm install && pnpm run build
cd -
node /tmp/qg-core/dist/cli.js collect --input /tmp/qg --output /tmp/qg/metrics.json
node /tmp/qg-core/dist/cli.js compare --metrics /tmp/qg/metrics.json --baseline NONE --config ./quality-gate.config.json --output /tmp/qg/report.json
```

## Workflows

- `.github/workflows/quality-gate-pr.yml` — runs on `pull_request` to `main`. Computes metrics, compares against baseline on `quality-metrics`, posts a sticky PR comment, fails the job on regression.
- `.github/workflows/quality-gate-main.yml` — runs on `push` to `main`. Recomputes metrics and force-pushes the new baseline + badges to the `quality-metrics` orphan branch.

Both workflows clone and build the upstream engine at the pinned commit at the start of each run.

The PR-mode workflow's job name is `quality-gate / quality-gate` — this is the required check for branch protection.

## Orphan branch

`quality-metrics` holds (force-pushed on every merge):
- `baseline.json` — the metrics snapshot the next PR is gated against.
- `badges/coverage.json`, `badges/quality.json` — shields.io endpoint format.
- `README.md` — auto-written by the engine; do not edit by hand.

The branch never accumulates history. The badge endpoints in the root `README.md` reference these files via `raw.githubusercontent.com`.

## Bootstrap

The first PR runs without a baseline. The engine returns `bootstrap: true`, skips ratchet comparisons, and only blocks on `block_severities` security vulnerabilities. Merging that PR creates the baseline; subsequent PRs are ratcheted normally.

## Tuning

Edit `quality-gate.config.json`:
- `ratchet.epsilon` — tolerance in pp for coverage drop / duplication rise. Currently `0.1`. Set `strict: true, epsilon: 0` for zero-drift mode.
- `thresholds.MAX_FILE_LINES` — per-file size cap. Currently `500`. Lower in a follow-up PR after the codebase shrinks.
- `thresholds.MIN_NEW_FILE_COVERAGE` — floor (0-100) for any new file. Currently `60`.
- `metrics.security.block_severities` / `warn_severities` — graduate `high` from warn to block once the codebase is clean.
