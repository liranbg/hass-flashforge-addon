# Delivery report

Status: published and verified.

## Repository

- Public GitHub repository: https://github.com/liranbg/hass-flashforge-addon
- Visibility: public (`gh repo view` returned `isPrivate=false`)
- Default branch: `main`
- Remote `main` SHA: `b07df37df87f01aaff7a6327681544d60cb26c1b`
- Tag: `v0.1.0` -> `b07df37df87f01aaff7a6327681544d60cb26c1b`

One scoped CI fix was made after the initial push: Dockerfile healthcheck was changed from shell form to JSON form to satisfy hadolint DL3025. Upstream FlashForgeWebUI release and pinned sha256 hashes were preserved.

## Release

- Release URL: https://github.com/liranbg/hass-flashforge-addon/releases/tag/v0.1.0
- Release name: `0.1.0`
- Published: `2026-10-10T09:03:35Z`
- Draft: false
- Prerelease: false

## CI and release workflows

- Passing CI run: https://github.com/liranbg/hass-flashforge-addon/actions/runs/38039934975
  - Head SHA: `b07df37df87f01aaff7a6327681544d60cb26c1b`
  - validate: passed metadata validation, Node syntax check, shellcheck, hadolint
  - build aarch64: passed Docker build and smoke test
  - build amd64: passed Docker build and smoke test
- Passing release run: https://github.com/liranbg/hass-flashforge-addon/actions/runs/38039993353
  - Head SHA: `b07df37df87f01aaff7a6327681544d60cb26c1b`
  - build-and-push aarch64: passed
  - build-and-push amd64: passed
  - GitHub release creation: passed

Historical note: the first CI run on the initially pushed commit `2bc1977f2593175fe9fe623c4c92d4eb265813f0` failed only on hadolint DL3025; both architecture builds/smoke tests in that run passed. The fix commit is included in the published release.

## Home Assistant image refs

`flashforge/config.yaml` contains:

- `version: "0.1.0"`
- `image: "ghcr.io/liranbg/hass-flashforge-addon/{arch}"`

So Home Assistant resolves the released images as:

- `ghcr.io/liranbg/hass-flashforge-addon/amd64:0.1.0`
- `ghcr.io/liranbg/hass-flashforge-addon/aarch64:0.1.0`

## GHCR publication verification

Anonymous Docker pulls were verified with an empty `DOCKER_CONFIG`.

- amd64 versioned ref: `ghcr.io/liranbg/hass-flashforge-addon/amd64:0.1.0`
  - Anonymous pull: passed
  - Repo digest from pull: `ghcr.io/liranbg/hass-flashforge-addon/amd64@sha256:6e91e5e8f4e5d74e66f15cf02ffb42e3dd0f062663eacc06528645287c3660f0`
  - Image manifest digest from anonymous manifest inspect: `sha256:d28271d858857b5dbad2d8cb96e5c649f3b22a727803f71f64fced7149b5044a`
  - Platform: `linux/amd64`
- aarch64 versioned ref: `ghcr.io/liranbg/hass-flashforge-addon/aarch64:0.1.0`
  - Anonymous pull: passed
  - Repo digest from pull: `ghcr.io/liranbg/hass-flashforge-addon/aarch64@sha256:8dd5ba780135b6c7847b56a286f5ce26e29df803cb4fc52654c4876cd707e3a3`
  - Image manifest digest from anonymous manifest inspect: `sha256:73eb578cd8a5a285ebf03ba80bd2aaf3101623a9250e6b12c9562abd016d1c9f`
  - Platform: `linux/arm64`

The release workflow also published `latest` tags for both architecture image paths.

## Local verification before publication

- `python3 tests/validate_metadata.py`: passed (`metadata ok`)
- `node --check flashforge/ingress-adapter.js`: passed
- `bash -n flashforge/run.sh tests/smoke.sh`: passed
- hadolint via Docker: passed after healthcheck lint fix

## Implemented scope

- Thin Home Assistant add-on repository layout: `repository.yaml`, `flashforge/config.yaml`, `flashforge/build.yaml`, `flashforge/Dockerfile`, `flashforge/run.sh`.
- Uses upstream Parallel-7/FlashForgeWebUI release `v1.2.0-alpha.3` binaries, with pinned sha256 per architecture:
  - amd64: `flashforge-webui-linux-x64.bin`, sha256 `ff22b0d62d33df70185ad80fd595cf9e14b4063cd47f7b523aaa031e0d80a1d3`
  - aarch64: `flashforge-webui-linux-arm64.bin`, sha256 `05b35967e0d13a7b182e809f917656145473c122df5b25479ad3d4da193c9959`
- Persistent data via `DATA_DIR=/data`.
- No published host ports in add-on metadata.
- No Home Assistant API, Supervisor API, auth API, privileged mode, host network, MQTT, entities, or production config mounts.
- Printers are configured through upstream UI only.
- go2rtc remains internal; browser camera WebSocket path is proxied through WebUI.

## Remaining live integration limits

- Home Assistant installation and printer validation were intentionally not performed in this publication run.
- No Home Assistant instance, printer, production service, or reset repair workflow was accessed.
- Live add-on behavior in the user's Home Assistant environment remains to be validated by the user during integration.
