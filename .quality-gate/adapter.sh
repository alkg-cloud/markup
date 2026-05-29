#!/usr/bin/env bash
# Quality Gate adapter for Markup (Next.js / pnpm / Vitest / Biome).
# Tools: vitest+v8 (coverage), biome (lint), jscpd (duplication), pnpm audit (security).
# Reads $QG_OUTPUT_DIR, $QG_CONFIG. Writes 6 canonical JSON files into $QG_OUTPUT_DIR.
#
# The CI workflows check out the repo and provide Node only — no `pnpm install`,
# no DB, no fixtures. This adapter therefore bootstraps its own environment
# (mirroring .github/workflows/test.yml) so coverage reflects the real suite.
#
# Ordering matters: lint runs before coverage so Biome never sees the generated
# coverage/ directory; coverage is produced last.
set -euo pipefail
: "${QG_OUTPUT_DIR:?must be set}"
: "${QG_CONFIG:?must be set}"

mkdir -p "$QG_OUTPUT_DIR"
MAX_FILE_LINES=$(jq -r '.thresholds.MAX_FILE_LINES' "$QG_CONFIG")
ROOT="$PWD"

# Scratch dir for tool reports we don't want to leave in the working tree.
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# Clear stale coverage output so the lint scan below sees only the committed tree.
rm -rf coverage

# --- Environment bootstrap (no-op locally where deps already exist) ----------
if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
  corepack prepare pnpm@10.33.0 --activate >/dev/null 2>&1 || true
fi
if [ ! -d node_modules ]; then
  pnpm install --frozen-lockfile
fi

# 1. Lint — Biome (json reporter), mirroring `pnpm lint` (biome check .).
# location.path is already a repo-relative string. Count errors + warnings;
# infos are advisory and excluded.
pnpm exec biome check . --reporter=json > "$SCRATCH/biome.json" 2>/dev/null || true
if [ -s "$SCRATCH/biome.json" ] && jq -e '.summary' "$SCRATCH/biome.json" >/dev/null 2>&1; then
  jq '
    [ .diagnostics[]? | select(.severity == "error" or .severity == "warning") ] as $d
    | {
        total: ($d | length),
        by_file: (
          $d
          | map(select((.location.path | type) == "string" and (.location.path | length) > 0))
          | group_by(.location.path)
          | map({ path: .[0].location.path, count: length })
          | sort_by(.path)
        )
      }
  ' "$SCRATCH/biome.json" > "$QG_OUTPUT_DIR/lint.json"
else
  echo '{"_skipped":"biome failed to produce a report"}' > "$QG_OUTPUT_DIR/lint.json"
fi

# 2. Duplication — jscpd over src/ (fetched on demand; no project dependency).
pnpm dlx jscpd src --reporters json --output "$SCRATCH/jscpd" \
  --ignore "**/node_modules/**,**/.next/**,**/coverage/**" --silent >/dev/null 2>&1 || true
if [ -f "$SCRATCH/jscpd/jscpd-report.json" ]; then
  jq '{ pct: (.statistics.total.percentage // 0), clones: (.statistics.total.clones // 0) }' \
    "$SCRATCH/jscpd/jscpd-report.json" > "$QG_OUTPUT_DIR/duplication.json"
else
  echo '{"_skipped":"jscpd failed"}' > "$QG_OUTPUT_DIR/duplication.json"
fi

# 3. File size — tracked source files only (git ls-files keeps this deterministic
# across local runs and the fresh CI checkout, ignoring build/output dirs).
git ls-files -z -- '*.js' '*.jsx' '*.ts' '*.tsx' '*.mjs' '*.cjs' \
  | while IFS= read -r -d '' f; do
      lines=$(wc -l < "$f")
      if [ "$lines" -ge "$MAX_FILE_LINES" ]; then
        printf '{"path":"%s","lines":%d}\n' "$f" "$lines"
      fi
    done | jq -s --argjson max "$MAX_FILE_LINES" \
      '{ max_lines: $max, violations: (sort_by(.path)) }' > "$QG_OUTPUT_DIR/file_size.json"

# 4. Security — pnpm audit (npm-compatible metadata.vulnerabilities shape).
pnpm audit --json > "$SCRATCH/audit.json" 2>/dev/null || true
if [ -s "$SCRATCH/audit.json" ] && jq -e '.metadata.vulnerabilities' "$SCRATCH/audit.json" >/dev/null 2>&1; then
  jq '.metadata.vulnerabilities
       | { critical: (.critical // 0), high: (.high // 0), moderate: (.moderate // 0), low: (.low // 0) }' \
       "$SCRATCH/audit.json" > "$QG_OUTPUT_DIR/security.json"
else
  echo '{"_skipped":"pnpm audit failed or produced no metadata"}' > "$QG_OUTPUT_DIR/security.json"
fi

# 5. Coverage — Vitest (v8 provider) with the json-summary reporter. Runs last so
# the generated coverage/ dir is absent during the lint scan above. Integration
# tests need a generated Prisma client and the fixture zips; the test DB is
# bootstrapped by tests/setup.ts. Build fixtures only if absent so local runs
# don't dirty the committed (non-deterministic) zips.
pnpm exec prisma generate >/dev/null 2>&1 || true
if [ ! -f tests/fixtures/mockups/valid-simple.zip ]; then
  pnpm exec tsx tests/fixtures/build-fixtures.ts >/dev/null 2>&1 || true
fi
pnpm exec vitest run --coverage --coverage.provider=v8 --coverage.reporter=json-summary >/dev/null 2>&1 || true
if [ -f coverage/coverage-summary.json ]; then
  jq --arg root "$ROOT/" '{
    lines_pct: (.total.lines.pct // 0),
    files: [
      to_entries[] | select(.key != "total")
      | { path: (.key | ltrimstr($root)), lines_pct: (.value.lines.pct // 0) }
    ] | sort_by(.path)
  }' coverage/coverage-summary.json > "$QG_OUTPUT_DIR/coverage.json"
else
  echo '{"_skipped":"vitest produced no coverage-summary.json"}' > "$QG_OUTPUT_DIR/coverage.json"
fi

# 6. _meta
cat > "$QG_OUTPUT_DIR/_meta.json" <<'JSON'
{
  "adapter": "node",
  "adapter_version": "0.1.0",
  "tools": ["vitest", "biome", "jscpd", "pnpm-audit"]
}
JSON
