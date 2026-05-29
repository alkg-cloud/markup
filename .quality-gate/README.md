# Quality Gate adapter

This directory holds the Markup-specific adapter for [`@quality-gate/core`](https://github.com/alkg-cloud/quality-gate).

`adapter.sh` is invoked by both `quality-gate-pr.yml` and `quality-gate-main.yml`. It reads two env vars (`QG_OUTPUT_DIR`, `QG_CONFIG`) and writes six canonical JSON files into `$QG_OUTPUT_DIR`. The schemas it must satisfy live at `src/schemas/*.schema.json` in the upstream repo.

To run locally:

```bash
mkdir -p /tmp/qg
QG_OUTPUT_DIR=/tmp/qg QG_CONFIG=./quality-gate.config.json ./.quality-gate/adapter.sh
ls /tmp/qg
```

For the engine contract (PR-mode, main-mode, baseline format), see `docs/quality-gate.md`.
