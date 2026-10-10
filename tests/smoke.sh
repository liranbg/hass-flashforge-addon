#!/usr/bin/env bash
set -euo pipefail

image="${1:?image required}"
container="flashforge-smoke-$RANDOM-$RANDOM"
data_dir="$(mktemp -d)"
cleanup() {
  docker logs "$container" >/tmp/flashforge-smoke.log 2>&1 || true
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf "$data_dir" 2>/dev/null || true
}
trap cleanup EXIT

docker run -d --name "$container" -p 127.0.0.1::3000 -v "$data_dir:/data" "$image" >/dev/null
port="$(docker inspect "$container" --format '{{(index (index .NetworkSettings.Ports "3000/tcp") 0).HostPort}}')"
base="http://127.0.0.1:$port"

for _ in $(seq 1 60); do
  if curl -fsS "$base/api/auth/status" >/dev/null; then
    break
  fi
  sleep 1
done

tmp_response="$data_dir/response.txt"

curl -fsS "$base/" -o "$tmp_response" && grep -q 'FlashForge Web UI' "$tmp_response"
curl -fsS "$base/gridstack.min.css" >/dev/null
curl -fsS "$base/app.js" >/dev/null
curl -fsS "$base/api/auth/status" -o "$tmp_response" && grep -q 'authRequired' "$tmp_response"
curl -fsS "$base/api/hassio_ingress/testtoken/" -o "$tmp_response" && grep -q 'FlashForge Web UI' "$tmp_response"
curl -fsS "$base/api/hassio_ingress/testtoken/api/auth/status" -o "$tmp_response" && grep -q 'authRequired' "$tmp_response"

test -d "$data_dir"
docker inspect "$container" --format '{{json .Config.Env}}' | grep -q 'DATA_DIR=/data'

docker exec "$container" sh -c 'test -d /data && test ! -e /config'
