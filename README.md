# FlashForge WebUI Home Assistant add-on

Home Assistant add-on wrapper for [Parallel-7/FlashForgeWebUI](https://github.com/Parallel-7/FlashForgeWebUI), pinned in the Docker build to `v1.2.0-alpha.3`.

This repository intentionally does not add Home Assistant entities, MQTT, printer-specific add-on options, or direct Home Assistant API access. Printer setup and saved printer data are handled by the upstream FlashForgeWebUI inside the ingress UI. Add-on options expose the upstream startup flags for connecting to no printers, the last used printer, all saved printers, and setting the WebUI password.

## Install

1. In Home Assistant, add this add-on repository: `https://github.com/liranbg/hass-flashforge-addon`.
2. Install `FlashForge WebUI`.
3. Start the add-on and open it from the sidebar.
4. Configure printers through the upstream UI.

## Experimental add-on

This repository also provides `FlashForge WebUI Experimental`, a separate add-on slug for testing `0.2.0-dev.N` changes without replacing the regular add-on. The experimental build is pinned to upstream FlashForgeWebUI stable `v1.1.0`.

## Security model

- Ingress only: the add-on does not publish host ports by default.
- No `hassio_api`, `homeassistant_api`, `auth_api`, privileged mode, host network, or production config mounts.
- Persistent app data lives in `/data` via `DATA_DIR=/data`.
- go2rtc is managed by upstream FlashForgeWebUI and is kept internal to the container; browser camera access goes through the WebUI camera proxy.

## Images

Home Assistant pulls per-architecture images:

- `ghcr.io/liranbg/hass-flashforge-addon/amd64:<version>`
- `ghcr.io/liranbg/hass-flashforge-addon/aarch64:<version>`

## Scope

This add-on packages the upstream web app. Home Assistant integration, entities, MQTT, automations, and live printer validation are outside this repository.
