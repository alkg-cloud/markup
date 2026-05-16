# Deploy

`markup.alego.cloud` is updated automatically on every push to `main` by a GitHub Actions workflow that runs on a **self-hosted runner** living on the VPS.

The runner is registered as the `deploy` Linux user. It has docker-socket access via the `docker` group (no `sudo` needed for any deploy step), and it talks to GitHub over outbound HTTPS — there are no inbound firewall holes opened for CI. The deploy job calls `docker/redeploy.sh` directly on the host; there is no `ssh`/`scp` between GitHub and the VPS.

## Pipeline

```
push to main
  └─ image workflow (.github/workflows/image.yml, runs on ubuntu-latest)
     - builds + pushes ghcr.io/alexandrecamillo/markup:<short-sha> and :latest
     - trivy + attestations + smoke test
     └─ on success → deploy workflow (.github/workflows/deploy.yml, runs on self-hosted markup-vps)
        - resolves image ref from the upstream run's head SHA
        - `bash docker/redeploy.sh "$IMAGE"` on the VPS host:
          snapshots current container env/labels/mounts/ports/network,
          stops + removes the container, recreates from the new image with
          everything preserved, forces healthcheck + HOSTNAME=0.0.0.0 +
          traefik.docker.network label, waits up to 90 s for `healthy`
        - verifies Traefik routing returns 200/3xx against 127.0.0.1:443
          for the Markup host header
        - prints the new container's startup logs
```

The deploy workflow is gated on the `image` workflow succeeding. A failed image build aborts the deploy — broken images never reach the VPS.

## Concurrency

`concurrency.group: deploy-markup, cancel-in-progress: false` — deploys queue rather than overlap. A still-running deploy finishes before the next one starts.

## Manual deploy

The Actions tab exposes `deploy` as a `workflow_dispatch` trigger. The optional `image_tag` input lets a maintainer redeploy a specific tag (e.g. `abc1234`, a semver, or `latest`). With no input, the workflow deploys the short SHA of `main`.

For ad-hoc deploys from a developer machine, use the `bump-markup-version` skill — it follows the same procedure as `docker/redeploy.sh`.

## Required GitHub secrets

Only one secret is needed at the workflow level since the runner already runs on the VPS:

| Secret | Used for |
|---|---|
| `MARKUP_URL` | Traefik `Host:` header verification target (e.g. `https://markup.alego.cloud`) |

The previous `VPS_IP` / `VPS_USER` / `VPS_PASSWORD` secrets are no longer consumed by the deploy workflow.

## Self-hosted runner

### Why a self-hosted runner

The VPS doesn't accept inbound SSH from arbitrary internet IPs (firewalled at the OS level). GitHub-hosted runners live on rotating Azure IPs that would need persistent allowlisting. A self-hosted runner inverts the connection direction: the runner long-polls GitHub over HTTPS and pulls jobs to execute locally. No inbound holes, no SSH credentials in CI, and the deploy itself runs in 10–15 s instead of 1–2 min (no SSH/SCP hops, no `sshpass`).

### Setup (one-time)

On the VPS, as the `deploy` user:

```bash
cd /path/to/markup-checkout   # any local checkout of this repo
# Generate a short-lived registration token (valid ~1 h):
TOKEN=$(gh api -X POST /repos/AlexandreCamillo/markup/actions/runners/registration-token --jq .token)
# Run the installer (downloads runner, registers, starts in tmux, adds @reboot crontab):
bash docker/install-runner.sh "$TOKEN"
```

The installer:

1. Downloads the latest GitHub Actions runner into `~/actions-runner`.
2. Registers it against the repo with labels `self-hosted,Linux,X64,markup-vps`.
3. Starts the runner in a detached tmux session (`gh-runner`).
4. Adds a `@reboot` crontab entry so the runner restarts after a VPS reboot.

Requirements on the VPS: the user must be in the `docker` group (so the runner can talk to the docker socket without sudo), and `tmux` must be installed.

### Operating the runner

| Action | Command |
|---|---|
| Check liveness | `tmux ls` (look for `gh-runner`) or `tail -n 50 ~/actions-runner/runner.log` |
| Attach console | `tmux attach -t gh-runner`  (Ctrl-b d to detach) |
| Restart | `tmux kill-session -t gh-runner && tmux new-session -d -s gh-runner "cd ~/actions-runner && ./run.sh"` |
| Remove from GitHub | `~/actions-runner/config.sh remove --token <removal-token>` (get token with `gh api -X POST /repos/AlexandreCamillo/markup/actions/runners/remove-token --jq .token`) and `crontab -l \| grep -v actions-runner \| crontab -` |
| List active runners | <https://github.com/AlexandreCamillo/markup/settings/actions/runners> |

### Hardening notes

- The runner accepts and executes arbitrary workflow YAML from the repo. Treat write access to `main` and to `.github/workflows/` as production access.
- The runner has docker-socket access, which is root-equivalent on the host. Restrict who can push to the workflow files accordingly.
- A `@reboot` crontab entry is the cheapest way to get persistence without root. For tighter persistence, install the runner as a systemd service (`sudo ~/actions-runner/svc.sh install`), which requires one-time sudo from a privileged user.

## Rollback

The workflow does not auto-rollback on a failed health check — it aborts and leaves the previous container state untouched. To roll back to a known-good image:

1. Trigger `deploy` manually with `image_tag` set to the previous short SHA or semver.
2. Or run the [bump-markup-version](../skills/bump-markup-version/SKILL.md) procedure with the desired tag on the VPS directly.

The Trivy and smoke-test gates in the image workflow make rollback rare in practice.

## Bootstrap

The redeploy script discovers config from the running container. The first-ever deploy of `markup` to a host has to be done manually (e.g. via `bump-markup-version`). After that, CD takes over.
