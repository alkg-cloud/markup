#!/usr/bin/env bash
# Runs on the self-hosted runner. Recreates the `markup` container from a
# new image while preserving env/labels/mounts/ports/network. Captures the
# previous image digest before destruction so we can roll back if the new
# image fails to come up healthy.
#
# Usage: redeploy.sh <IMAGE_REF>
#   e.g.  redeploy.sh ghcr.io/alexandrecamillo/markup:abc1234

set -euo pipefail

IMAGE="${1:?image ref is required (e.g. ghcr.io/alexandrecamillo/markup:abc1234)}"
NAME=markup

if ! docker inspect "$NAME" >/dev/null 2>&1; then
  echo "ERROR: container '$NAME' does not exist on this host — bootstrap manually before enabling CD." >&2
  exit 1
fi

# --- snapshot current config (used for both recreate and rollback) ---
PREV_IMAGE=$(docker inspect "$NAME" --format '{{.Image}}')
echo "→ previous image digest: $PREV_IMAGE"

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

build_args() {
  local -a out=()
  for e in "${ENV_LINES[@]}"; do out+=(-e "$e"); done
  for l in "${LABEL_LINES[@]}"; do out+=(-l "$l"); done
  for b in "${BIND_LINES[@]}"; do out+=(-v "$b"); done
  for p in "${PORT_LINES[@]}"; do out+=(-p "$p"); done
  printf '%s\n' "${out[@]}"
}

run_container() {
  local image_ref="$1"
  local -a args=()
  while IFS= read -r line; do args+=("$line"); done < <(build_args)
  docker run -d \
    --name "$NAME" \
    --restart unless-stopped \
    --network "$NETWORK" \
    --health-cmd 'curl -f http://127.0.0.1:3000/api/health || exit 1' \
    --health-interval 30s \
    --health-timeout 5s \
    --health-start-period 10s \
    --health-retries 3 \
    "${args[@]}" \
    -l "traefik.docker.network=$NETWORK" \
    -e HOSTNAME=0.0.0.0 \
    "$image_ref" >/dev/null
}

wait_healthy() {
  local status
  for i in $(seq 1 30); do
    sleep 3
    status=$(docker inspect "$NAME" --format '{{.State.Health.Status}}' 2>/dev/null || echo unknown)
    echo "  [$i] $status"
    if [ "$status" = healthy ]; then
      return 0
    fi
  done
  return 1
}

verify_traefik() {
  local host="$1"
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' \
    -H "Host: $host" https://127.0.0.1:443/ -k || echo 000)
  echo "  Traefik HTTP $code for Host: $host"
  case "$code" in
    200|301|302|307|308) return 0 ;;
    *) return 1 ;;
  esac
}

# --- deploy ---
echo "→ pulling $IMAGE"
docker pull "$IMAGE"

echo "→ stopping + removing $NAME (previous digest preserved: $PREV_IMAGE)"
docker stop "$NAME" >/dev/null
docker rm "$NAME" >/dev/null

echo "→ recreating $NAME on network $NETWORK with $IMAGE"
run_container "$IMAGE"

echo "→ waiting for healthy"
if wait_healthy; then
  echo "→ healthy"
else
  echo "→ NEW IMAGE FAILED HEALTH CHECK — rolling back"
  docker logs "$NAME" --tail 50 >&2 || true
  docker stop "$NAME" >/dev/null || true
  docker rm "$NAME" >/dev/null || true
  echo "→ recreating $NAME with previous digest $PREV_IMAGE"
  run_container "$PREV_IMAGE"
  if wait_healthy; then
    echo "→ rollback healthy — site is live on previous image; deploy failed"
    exit 1
  fi
  echo "::error::deploy failed AND rollback failed — manual intervention required" >&2
  docker logs "$NAME" --tail 50 >&2 || true
  exit 2
fi

# Verify Traefik routing on success path. MARKUP_URL may be a bare host
# (e.g. "markup.alego.cloud") or a full URL.
if [ -n "${MARKUP_URL:-}" ]; then
  host="${MARKUP_URL#http://}"
  host="${host#https://}"
  host="${host%%/*}"
  echo "→ verifying Traefik routing"
  if ! verify_traefik "$host"; then
    echo "::warning::Traefik did not return a 2xx/3xx — deploy did not roll back, investigate"
  fi
fi

echo "→ deploy complete"
docker logs "$NAME" --tail 20 || true
