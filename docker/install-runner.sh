#!/usr/bin/env bash
# One-shot installer for the GitHub Actions self-hosted runner that powers
# the `deploy` workflow.
#
# Run on the VPS as the `deploy` user (no sudo required — the user must already
# be in the `docker` group, which it is on the Markup VPS).
#
#   bash docker/install-runner.sh <REGISTRATION_TOKEN>
#
# The registration token is short-lived (~1 h). Generate it with:
#
#   gh api -X POST /repos/AlexandreCamillo/markup/actions/runners/registration-token --jq .token
#
# What this does:
#   1. Downloads the latest GitHub Actions runner into ~/actions-runner
#   2. Registers the runner with the repo using labels: self-hosted,Linux,X64,markup-vps
#   3. Starts the runner in a detached tmux session (survives SSH disconnect)
#   4. Adds a `@reboot` crontab entry so the runner restarts after VPS reboots
#
# To remove the runner later:
#   ~/actions-runner/config.sh remove --token <REMOVAL_TOKEN>
#   (removal token from `gh api -X POST .../runners/remove-token --jq .token`)
#   crontab -l | grep -v actions-runner | crontab -

set -euo pipefail

TOKEN="${1:?usage: $0 <REGISTRATION_TOKEN>}"
REPO_URL="https://github.com/AlexandreCamillo/markup"
RUNNER_NAME="${RUNNER_NAME:-markup-vps-deploy}"
RUNNER_LABELS="${RUNNER_LABELS:-self-hosted,Linux,X64,markup-vps}"
RUNNER_DIR="${HOME}/actions-runner"
TMUX_SESSION="${TMUX_SESSION:-gh-runner}"

if ! groups | tr ' ' '\n' | grep -qx docker; then
  echo "ERROR: current user is not in the 'docker' group — runner needs docker access" >&2
  exit 1
fi

if ! command -v tmux >/dev/null; then
  echo "ERROR: tmux not found — install it (sudo apt-get install -y tmux) before running this script" >&2
  exit 1
fi

# 1. Download runner if not already present.
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"
if [ ! -x ./run.sh ]; then
  echo "→ resolving latest runner version"
  ver=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest \
        | python3 -c "import json,sys; print(json.load(sys.stdin)['tag_name'].lstrip('v'))")
  url="https://github.com/actions/runner/releases/download/v${ver}/actions-runner-linux-x64-${ver}.tar.gz"
  echo "→ downloading $url"
  curl -fsSL "$url" -o /tmp/actions-runner.tgz
  tar xzf /tmp/actions-runner.tgz
  rm /tmp/actions-runner.tgz
fi

# 2. (Re-)register. `--replace` makes this idempotent if the name already exists.
echo "→ configuring runner '$RUNNER_NAME' against $REPO_URL"
./config.sh --unattended --replace \
  --url "$REPO_URL" \
  --token "$TOKEN" \
  --name "$RUNNER_NAME" \
  --labels "$RUNNER_LABELS" \
  --work _work

# 3. Start in tmux (idempotent: kill any existing session first).
echo "→ starting runner in tmux session '$TMUX_SESSION'"
tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true
tmux new-session -d -s "$TMUX_SESSION" "cd $RUNNER_DIR && ./run.sh 2>&1 | tee -a $RUNNER_DIR/runner.log"

# 4. Persistence across reboots via user crontab.
CRON_LINE="@reboot tmux new-session -d -s $TMUX_SESSION 'cd $RUNNER_DIR && ./run.sh 2>&1 | tee -a $RUNNER_DIR/runner.log'"
if ! crontab -l 2>/dev/null | grep -Fq "$RUNNER_DIR/run.sh"; then
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "→ added @reboot entry to crontab"
else
  echo "→ crontab already has a runner entry; leaving as-is"
fi

sleep 2
if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
  echo
  echo "✓ runner installed and running."
  echo "  inspect: tmux attach -t $TMUX_SESSION  (Ctrl-b d to detach)"
  echo "  logs:    tail -f $RUNNER_DIR/runner.log"
  echo "  status:  visit $REPO_URL/settings/actions/runners"
else
  echo "ERROR: tmux session is not running — check $RUNNER_DIR/runner.log" >&2
  exit 1
fi
