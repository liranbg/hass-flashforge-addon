#!/usr/bin/env bash
set -euo pipefail

image="${1:?image required}"
container="flashforge-smoke-$RANDOM-$RANDOM"
data_dir="$(mktemp -d)"
cleanup() {
  docker logs "$container" >"${TMPDIR:-/tmp}/$container.log" 2>&1 || true
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf "$data_dir" 2>/dev/null || true
}
trap cleanup EXIT

# No published ports or network access: all probes use container loopback.
base="http://127.0.0.1:3000"
request() {
  docker exec "$container" curl -fsS "$@"
}
start() {
  docker run -d --name "$container" --network none -v "$data_dir:/data" "$image" >/dev/null
  for _ in $(seq 1 60); do
    if request "$base/api/auth/status" >"$data_dir/response.txt" 2>/dev/null; then return; fi
    sleep 1
  done
  echo 'FlashForge failed to become ready' >&2
  return 1
}
restart() {
  docker rm -f "$container" >/dev/null
  start
}

start
tmp_response="$data_dir/response.txt"
request "$base/" >"$tmp_response"
grep -q 'FlashForge Web UI' "$tmp_response"
request "$base/api/auth/status" >"$tmp_response"
grep -q '"authRequired":true' "$tmp_response"
request "$base/gridstack.min.css" >/dev/null
request "$base/app.js" >/dev/null
prefix="$base/api/hassio_ingress/testtoken"
request "$prefix/" >"$tmp_response"
grep -q 'FlashForge Web UI' "$tmp_response"
request "$prefix/api/auth/status" >"$tmp_response"
grep -q '"authRequired":true' "$tmp_response"

# Verify the actual 1.2.1 modules still match the ingress API/WS rewrites.
request "$prefix/core/Transport.js" >"$tmp_response"
grep -Fq 'fetch(withIngressBase(endpoint)' "$tmp_response"
# Literal JavaScript template expression, not shell interpolation.
# shellcheck disable=SC2016
grep -Fq '${getIngressBasePath()}/ws${tokenQuery}' "$tmp_response"
request "$prefix/features/camera.js" >"$tmp_response"
grep -Fq 'const relativeWsUrl = config.wsUrl.startsWith' "$tmp_response"

# Persist a user setting and explicit password, then exercise auth through ingress.
printf '%s\n' '{"no_printers":true,"webui_password":"isolated-smoke-password"}' >"$data_dir/options.json"
docker exec "$container" node -e 'const fs=require("fs"); const p="/data/config.json"; const c=JSON.parse(fs.readFileSync(p)); c.DiscordUpdateIntervalMinutes=17; fs.writeFileSync(p,JSON.stringify(c))'
restart
request -H 'Content-Type: application/json' -d '{"password":"isolated-smoke-password"}' "$prefix/api/auth/login" >"$tmp_response"
grep -q '"token":' "$tmp_response"
docker exec "$container" node -e 'const c=JSON.parse(require("fs").readFileSync("/data/config.json")); if(c.DiscordUpdateIntervalMinutes!==17) process.exit(1)'

if [[ "$image" == *dev* ]]; then
  # DEV alone supports opting out of upstream auth. Keep existing config fields.
  printf '%s\n' '{"no_auth":true}' >"$data_dir/options.json"
  restart
  request "$prefix/api/auth/status" >"$tmp_response"
  grep -q '"authRequired":false' "$tmp_response"
  docker exec "$container" node -e 'const c=JSON.parse(require("fs").readFileSync("/data/config.json")); if(c.WebUIPasswordRequired!==false || c.DiscordUpdateIntervalMinutes!==17) process.exit(1)'

  # Turning the option off must preserve the existing upstream value.
  printf '%s\n' '{"no_auth":false}' >"$data_dir/options.json"
  restart
  request "$prefix/api/auth/status" >"$tmp_response"
  grep -q '"authRequired":false' "$tmp_response"
  docker exec "$container" node -e 'const c=JSON.parse(require("fs").readFileSync("/data/config.json")); if(c.WebUIPasswordRequired!==false || c.DiscordUpdateIntervalMinutes!==17) process.exit(1)'
fi

test -d "$data_dir"
docker inspect "$container" --format '{{json .Config.Env}}' | grep -q 'DATA_DIR=/data'
docker exec "$container" sh -c 'test -d /data && test ! -e /config'
echo "smoke ok: $image (isolated ingress, auth, assets, persistence)"
