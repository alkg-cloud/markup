#!/usr/bin/env bash
# Runs on the VPS during automated deploy. Discovers the live `markup`
# container's runtime config (env, labels, mounts, ports, network) and
# recreates the container from a new image while preserving everything.
#
# Mirrors the manual procedure in `skills/bump-markup-version/SKILL.md`.
#
# Usage: redeploy.sh <IMAGE_REF>

set -euo pipefail

IMAGE="${1:?image ref is required (e.g. ghcr.io/alexandrecamillo/markup:abc1234)}"
NAME=markup

if ! docker inspect "$NAME" >/dev/null 2>&1; then
  echo "ERROR: container '$NAME' does not exist on this host — bootstrap manually before enabling CD." >&2
  exit 1
fi

ENV_JSON=$(docker inspect "$NAME" --format '{{json .Config.Env}}')
LABELS_JSON=$(docker inspect "$NAME" --format '{{json .Config.Labels}}')
BINDS_JSON=$(docker inspect "$NAME" --format '{{json .HostConfig.Binds}}')
PORTS_JSON=$(docker inspect "$NAME" --format '{{json .HostConfig.PortBindings}}')
NETWORK=$(docker inspect "$NAME" --format '{{json .NetworkSettings.Networks}}' \
          | python3 -c "import json,sys; print(next(iter(json.load(sys.stdin))))")

mapfile -t ENV_LINES < <(printf '%s' "$ENV_JSON" | python3 -c '
import json, sys
for e in json.load(sys.stdin) or []:
    print(e)
')
mapfile -t LABEL_LINES < <(printf '%s' "$LABELS_JSON" | python3 -c '
import json, sys
d = json.load(sys.stdin) or {}
for k, v in d.items():
    print(f"{k}={v}")
')
mapfile -t BIND_LINES < <(printf '%s' "$BINDS_JSON" | python3 -c '
import json, sys
for b in json.load(sys.stdin) or []:
    print(b)
')
mapfile -t PORT_LINES < <(printf '%s' "$PORTS_JSON" | python3 -c '
import json, sys
d = json.load(sys.stdin) or {}
for container_port, hosts in d.items():
    for h in hosts or []:
        host_ip = h.get("HostIp") or ""
        host_port = h.get("HostPort", "")
        prefix = (host_ip + ":") if host_ip else ""
        print(f"{prefix}{host_port}:{container_port}")
')

ARGS=()
for e in "${ENV_LINES[@]}"; do ARGS+=(-e "$e"); done
for l in "${LABEL_LINES[@]}"; do ARGS+=(-l "$l"); done
for b in "${BIND_LINES[@]}"; do ARGS+=(-v "$b"); done
for p in "${PORT_LINES[@]}"; do ARGS+=(-p "$p"); done

echo "→ pulling $IMAGE"
docker pull "$IMAGE"

echo "→ stopping + removing $NAME"
docker stop "$NAME" >/dev/null
docker rm "$NAME" >/dev/null

echo "→ recreating $NAME on network $NETWORK"
# Captured ARGS come first; the explicit overrides at the end win when keys
# collide (HOSTNAME, traefik.docker.network), and the healthcheck flags are
# always ours.
docker run -d \
  --name "$NAME" \
  --restart unless-stopped \
  --network "$NETWORK" \
  --health-cmd 'curl -f http://127.0.0.1:3000/api/health || exit 1' \
  --health-interval 30s \
  --health-timeout 5s \
  --health-start-period 10s \
  --health-retries 3 \
  "${ARGS[@]}" \
  -l "traefik.docker.network=$NETWORK" \
  -e HOSTNAME=0.0.0.0 \
  "$IMAGE" >/dev/null

echo "→ waiting for healthy"
for i in $(seq 1 30); do
  sleep 3
  status=$(docker inspect "$NAME" --format '{{.State.Health.Status}}' 2>/dev/null || echo unknown)
  echo "  [$i] $status"
  if [ "$status" = healthy ]; then
    echo "→ healthy"
    exit 0
  fi
done

echo "ERROR: health check did not pass within timeout" >&2
echo "--- last 50 log lines ---" >&2
docker logs "$NAME" --tail 50 >&2
exit 1
