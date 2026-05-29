#!/usr/bin/env bash
# Quality Gate adapter for the Markup project.
# Stack: vitest (coverage) + biome (lint) + jscpd (duplication) + pnpm audit (security).
#
# Contract (from upstream src/schemas/*.schema.json):
#   Inputs:  $QG_OUTPUT_DIR (must exist, writable), $QG_CONFIG (path to quality-gate.config.json)
#   Outputs (exactly 6 files in $QG_OUTPUT_DIR):
#     coverage.json    — { lines_pct, files:[{path,lines_pct}] }   OR { _skipped }
#     lint.json        — { total, by_file:[{path,count}] }         OR { _skipped }
#     duplication.json — { pct, clones? }                          OR { _skipped }
#     file_size.json   — { max_lines, violations:[{path,lines}] }  OR { _skipped }
#     security.json    — { critical, high, moderate, low }         OR { _skipped }
#     _meta.json       — { adapter, adapter_version, tools[] }
#
# All paths in metric files are repo-relative (no leading "./" or absolute).
set -euo pipefail
: "${QG_OUTPUT_DIR:?must be set}"
: "${QG_CONFIG:?must be set}"

mkdir -p "$QG_OUTPUT_DIR"
ROOT="$PWD"
MAX_FILE_LINES=$(jq -r '.thresholds.MAX_FILE_LINES' "$QG_CONFIG")

# Each metric is filled in by a dedicated section below.
# Sections must produce a strictly schema-compliant file even on tool failure
# (use the {"_skipped":"…"} fallback to keep the gate green for that metric).

# --- 1. Coverage (consumes coverage/coverage-summary.json produced by vitest) ---
if [ -f coverage/coverage-summary.json ]; then
  jq --arg root "$ROOT/" '
    .total.lines.pct as $total
    | {
        lines_pct: ($total // 0),
        files: [
          to_entries[]
          | select(.key != "total")
          | {
              path: (.key | sub("^" + ($root | @text); "")),
              lines_pct: (.value.lines.pct // 0)
            }
        ]
        | sort_by(.path)
      }
  ' coverage/coverage-summary.json > "$QG_OUTPUT_DIR/coverage.json"
else
  echo '{"_skipped":"coverage/coverage-summary.json missing — did the workflow run pnpm test --coverage?"}' \
    > "$QG_OUTPUT_DIR/coverage.json"
fi

# --- 2. Lint (biome --reporter=json; biome exits 1 with violations, hence || true) ---
pnpm exec biome check . --reporter=json 2>/dev/null > .biome-report.json || true
if [ -s .biome-report.json ] && jq -e '.diagnostics' .biome-report.json > /dev/null 2>&1; then
  jq --arg root "$ROOT/" '
    # Aggregate diagnostics by file path; biome paths can be absolute or relative.
    # Biome 2.x emits .location.path as a string; older shapes used {file: "..."}.
    # Handle both defensively.
    reduce .diagnostics[] as $d ({};
      (($d.location.path | if type == "object" then .file else . end) // "unknown") as $raw
      | ($raw | sub("^" + ($root | @text); "")) as $rel
      | .[$rel] = ((.[$rel] // 0) + 1)
    )
    | {
        total: ([.[]] | add // 0),
        by_file: [
          to_entries[] | { path: .key, count: .value }
        ] | sort_by(.path)
      }
  ' .biome-report.json > "$QG_OUTPUT_DIR/lint.json"
else
  echo '{"_skipped":"biome produced no parseable JSON report"}' > "$QG_OUTPUT_DIR/lint.json"
fi

# --- _meta.json (placeholder — final task overwrites with real tool list) ---
echo '{"adapter":"markup","adapter_version":"0.1.0","tools":[]}' > "$QG_OUTPUT_DIR/_meta.json"
