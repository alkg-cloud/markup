---
name: bump-markup-version
description: Deploy the latest Markup Docker image to the VPS. Use when asked to update, deploy, bump, or redeploy the Markup application on the production server.
allowed-tools: [Bash, Read, Grep, Glob]
---

# Bump Markup Version

Deploy the latest `ghcr.io/alexandrecamillo/markup` Docker image to the VPS.

## Required Environment Variables

These must be set in the agent's environment. If any are missing, abort and tell the user which are needed.

| Variable | Description |
|---|---|
| `VPS_IP` | VPS IP address |
| `VPS_USER` | SSH username |
| `VPS_PASSWORD` | SSH password |

## Pre-flight

Verify the latest `image` workflow on main passed:

```bash
gh run list --workflow=image.yml --branch=main --limit 1
```

If the latest run failed, abort. Do not deploy a broken image.

## Procedure

### 1. Install sshpass if needed

```bash
which sshpass || sudo apt-get install -y -qq sshpass
```

### 2. Discover current container config

```bash
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" '
  echo "---ENV---"
  docker inspect markup --format "{{json .Config.Env}}"
  echo "---LABELS---"
  docker inspect markup --format "{{json .Config.Labels}}"
  echo "---MOUNTS---"
  docker inspect markup --format "{{json .HostConfig.Binds}}"
  echo "---NETWORKS---"
  docker inspect markup --format "{{json .NetworkSettings.Networks}}" | python3 -c "import json,sys; print(\",\".join(json.load(sys.stdin).keys()))"
  echo "---PORTS---"
  docker inspect markup --format "{{json .HostConfig.PortBindings}}"
'
```

Parse the output to reconstruct the `docker run` command. Preserve all env vars, labels, mounts, and network.

### 3. Pull new image

```bash
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" \
  'docker pull ghcr.io/alexandrecamillo/markup:latest'
```

### 4. Stop, remove, recreate

Reconstruct the `docker run` from Step 2 config. Critical requirements:

- `--name markup --restart unless-stopped`
- `--network <same-network>` (typically `traefik-shared`)
- Same port mapping, volume mount, env vars, and Traefik labels
- **Must include** `-e HOSTNAME=0.0.0.0` (Next.js standalone binding)
- **Must include** `-l traefik.docker.network=<network>`
- **Must override healthcheck**: `--health-cmd "curl -f http://127.0.0.1:3000/api/health || exit 1" --health-interval 30s --health-timeout 5s --health-start-period 10s --health-retries 3`

### 5. Wait for healthy

```bash
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" '
  for i in $(seq 1 20); do
    sleep 3
    status=$(docker inspect markup --format "{{.State.Health.Status}}")
    echo "$i: $status"
    if [ "$status" = "healthy" ]; then exit 0; fi
  done
  echo "TIMEOUT"
  docker logs markup --tail 30
  exit 1
'
```

If timeout, report logs and do NOT proceed.

### 6. Verify Traefik routing

```bash
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" '
  curl -sS -o /dev/null -w "%{http_code}" -H "Host: markup.alego.cloud" https://127.0.0.1:443/ -k
'
```

Expected: `307` or `200`. If `404`, container is on wrong network or missing `traefik.docker.network` label.

### 7. Check startup logs

```bash
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" \
  'docker logs markup 2>&1 | head -20'
```

Confirm migrations applied and boot completed.

## Rollback

If broken, the previous image digest is shown during `docker pull`. Recreate with that digest:

```bash
ghcr.io/alexandrecamillo/markup@sha256:<previous-digest>
```

## Report

After deployment, report: image digest, migrations run, health status, Traefik status, and URL (https://markup.alego.cloud).
