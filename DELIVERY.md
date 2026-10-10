# Delivery report

Status: blocked before publication.

Blocker: GitHub authentication for the configured coder profile can authenticate as `liranbg`, but cannot create the requested public repository. `gh repo create liranbg/hass-flashforge-addon --public` returned:

```text
GraphQL: Resource not accessible by personal access token (createRepository)
```

Verified local artifacts:

- Local project: `/home/liranbg/hass-flashforge-addon`
- Commit: `3df8f71 Initial FlashForge WebUI add-on`
- Add-on metadata validates with `python3 tests/validate_metadata.py`.
- Ingress adapter syntax validates with `node --check flashforge/ingress-adapter.js`.
- Shell scripts parse with `bash -n flashforge/run.sh tests/smoke.sh`.
- Local amd64 container builds from `ghcr.io/home-assistant/amd64-base-debian:bookworm`.
- Local smoke test passed for `hass-flashforge-addon:local-amd64`:
  - container starts
  - `/api/auth/status` responds
  - `/` serves FlashForge Web UI
  - `gridstack.min.css` and `app.js` serve
  - synthetic ingress prefix `/api/hassio_ingress/testtoken/` serves the UI
  - synthetic ingress prefix `/api/hassio_ingress/testtoken/api/auth/status` responds
  - `DATA_DIR=/data` is present

Implemented scope:

- Thin Home Assistant add-on repository layout: `repository.yaml`, `flashforge/config.yaml`, `flashforge/build.yaml`, `flashforge/Dockerfile`, `flashforge/run.sh`.
- Uses upstream Parallel-7/FlashForgeWebUI release `v1.2.0-alpha.3` binaries, with pinned sha256 per architecture:
  - amd64: `flashforge-webui-linux-x64.bin`, sha256 `ff22b0d62d33df70185ad80fd595cf9e14b4063cd47f7b523aaa031e0d80a1d3`
  - aarch64: `flashforge-webui-linux-arm64.bin`, sha256 `05b35967e0d13a7b182e809f917656145473c122df5b25479ad3d4da193c9959`
- Persistent data via `DATA_DIR=/data`.
- No published host ports in add-on metadata.
- No Home Assistant API, Supervisor API, auth API, privileged mode, host network, MQTT, entities, or production config mounts.
- Printers are configured through upstream UI only.
- go2rtc remains internal; browser camera WebSocket path is proxied through WebUI.
- CI workflow builds/tests amd64 and aarch64.
- Release workflow builds/pushes GHCR per-arch images and creates GitHub release on tag.

Not completed because of the GitHub token blocker:

- Public GitHub repo URL: not created.
- Remote commit SHA: not pushed.
- Release URL: not created.
- CI run URLs: unavailable.
- Published GHCR image refs/digests: unavailable.
- Package public visibility: not applicable until packages are published.

Next required user/admin action:

Provide/create a GitHub token for `liranbg` with permission to create public repositories and publish packages, or create `liranbg/hass-flashforge-addon` manually as a public repo and ensure the current environment can push to it. Then run:

```bash
cd /home/liranbg/hass-flashforge-addon
git remote add origin https://github.com/liranbg/hass-flashforge-addon.git 2>/dev/null || true
git push -u origin main
git tag v0.1.0
git push origin v0.1.0
```

After workflows complete, verify package visibility and image digests before installing in Home Assistant.
