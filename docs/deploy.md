# Deploy

`markup.alego.cloud` is updated automatically on every push to `main`.

## Pipeline

```
push to main
  └─ image workflow (.github/workflows/image.yml)
     - builds + pushes ghcr.io/alexandrecamillo/markup:<short-sha> and :latest
     - runs trivy, attestations, smoke test
     └─ on success → deploy workflow (.github/workflows/deploy.yml)
        - resolves image ref from the upstream run's head SHA
        - SCPs `docker/redeploy.sh` to the VPS
        - VPS script: snapshots current container's env/labels/mounts/ports/network,
          recreates the container from the new image preserving all of it,
          overrides healthcheck + `HOSTNAME=0.0.0.0` + `traefik.docker.network`
        - waits up to 90 s for the container to report `healthy`
        - verifies Traefik routing returns 200/3xx for the Markup host
        - prints the new container's startup logs
```

The deploy workflow is gated on the `image` workflow succeeding. A failed image build aborts the deploy — broken images never reach the VPS.

## Concurrency

`concurrency.group: deploy-markup, cancel-in-progress: false` — deploys queue rather than overlap. A still-running deploy finishes before the next one starts.

## Manual deploy

The Actions tab exposes `deploy` as a `workflow_dispatch` trigger. The optional `image_tag` input lets a maintainer redeploy a specific tag (e.g. `abc1234`, a semver, or `latest`). With no input, the workflow deploys the short SHA of `main`.

For ad-hoc deploys from a developer machine, use the `bump-markup-version` skill — it follows the same procedure as `docker/redeploy.sh`.

## Required GitHub secrets

| Secret | Used for |
|---|---|
| `VPS_IP` | SSH host |
| `VPS_USER` | SSH user |
| `VPS_PASSWORD` | SSH password (consumed by `sshpass`) |
| `MARKUP_URL` | Traefik `Host:` header verification target (e.g. `https://markup.alego.cloud`) |

Missing secrets cause the workflow's first step to abort with a clear error.

## Rollback

The workflow does not auto-rollback on a failed health check — it aborts and leaves the previous container state. To roll back to a known-good image:

1. Trigger `deploy` manually with `image_tag` set to the previous short SHA or semver.
2. Or run the [bump-markup-version](../skills/bump-markup-version/SKILL.md) procedure with the desired tag on the VPS directly.

The Trivy and smoke-test gates in the image workflow make rollback rare in practice.

## Bootstrap

The redeploy script discovers config from the running container. The first-ever deploy of `markup` to a host has to be done manually (e.g. via `bump-markup-version`). After that, CD takes over.
