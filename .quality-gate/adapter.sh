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

# --- _meta.json (placeholder — final task overwrites with real tool list) ---
echo '{"adapter":"markup","adapter_version":"0.1.0","tools":[]}' > "$QG_OUTPUT_DIR/_meta.json"
