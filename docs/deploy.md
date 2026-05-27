# Deploy

`markup.alego.cloud` is updated automatically on every push to `main`.

## Pipeline

```
push to main
  └─ image workflow (.github/workflows/image.yml)
     - builds + pushes ghcr.io/alkg-cloud/markup:<short-sha> and :latest
     - runs trivy, attestations, smoke test
     └─ on success → deploy workflow (.github/workflows/deploy.yml)
        - runs-on: [self-hosted, markup-vps]
        - checks out the SHA the image was built from
        - runs docker/redeploy.sh "<image-ref>" on the VPS
        - script snapshots running container config, recreates from new image,
          waits for healthy, verifies Traefik routing, auto-rolls back on failure
```

The deploy workflow is gated on the `image` workflow succeeding. A failed image build aborts the deploy — broken images never reach the VPS.

## Runner architecture

The CD job runs on a self-hosted GitHub Actions runner that lives on the VPS as a Docker container named `gh-runner`. The runner dials `github.com:443` outbound to fetch jobs — there is no inbound port open for CI to reach. This works around the Hostinger/ISP upstream that blocks public access to port 22 of the VPS.

The runner is configured `EPHEMERAL=true`: it executes one job and exits. Docker's `restart: unless-stopped` policy then recreates the container, which re-registers a fresh runner against GitHub. This guarantees a clean filesystem per job and self-heals from stuck states.

The runner has `/var/run/docker.sock` bind-mounted from the host, so `redeploy.sh` runs `docker pull` / `docker run` against the same daemon that hosts the `markup` container.

## Concurrency

`concurrency.group: deploy-markup, cancel-in-progress: false` — deploys queue rather than overlap. A still-running deploy finishes before the next one starts.

## Manual deploy

The Actions tab exposes `deploy` as a `workflow_dispatch` trigger. The optional `image_tag` input lets a maintainer redeploy a specific tag (e.g. `abc1234`, a semver, or `latest`). With no input, the workflow deploys the short SHA of `main`.

For ad-hoc deploys from a developer machine (e.g. when the runner is offline), use the `bump-markup-version` skill — it follows the same procedure as `docker/redeploy.sh` over an SSH session.

## Required GitHub secrets

| Secret | Used for |
|---|---|
| `MARKUP_URL` | Traefik `Host:` header verification target after deploy (e.g. `markup.alego.cloud` or a full URL) |

No SSH or VPS credentials are stored in GitHub secrets. The runner authenticates outbound to GitHub via a PAT held only on the VPS in `.env.runner`.

## Rollback

`redeploy.sh` captures the previous image digest before destroying the old container. If the new image fails to report `healthy` within 90 s, the script:

1. Stops + removes the failed new container.
2. Recreates the old container from the captured digest.
3. Waits for it to become healthy.
4. Exits 1 if rollback succeeds (site is live on previous image, deploy failed), or 2 if rollback also fails (site is down, manual intervention).

For a deliberate rollback to a specific prior image, trigger `deploy` manually with `image_tag` set to that tag (short SHA, semver, or `latest`).

## Bootstrap

The runner is installed on the VPS via:

```bash
cp .env.runner.example .env.runner
# edit .env.runner: set ACCESS_TOKEN to a GitHub PAT with `repo` scope
sudo docker compose -f docker-compose.runner.yml --env-file .env.runner up -d
sudo docker logs --tail 50 -f gh-runner    # wait for "Listening for Jobs"
```

The first-ever deploy of the `markup` container to a host has to be done manually (e.g. via `bump-markup-version`). After that, CD takes over.

## Operator playbook

| Task | Command |
|---|---|
| Inspect runner logs | `sudo docker logs -f gh-runner` |
| Restart runner | `sudo docker compose -f docker-compose.runner.yml restart` |
| Upgrade runner image | `sudo docker pull myoung34/github-runner:ubuntu-noble`, bump digest in compose, `up -d --force-recreate` |
| Remove runner entirely | `sudo docker compose -f docker-compose.runner.yml down --volumes`, then on GitHub: `gh api -X DELETE /repos/alkg-cloud/markup/actions/runners/<id>` |
| Rotate PAT | Update `ACCESS_TOKEN` in `.env.runner`, `up -d --force-recreate` |
