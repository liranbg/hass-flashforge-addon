# Changelog

## 0.2.0

- Promote the tested experimental add-on using stable upstream FlashForgeWebUI `v1.1.0` to the regular add-on.
- Preserve the ingress adapter's CSS fix for the upstream reboot overlay.
- Revert custom no-printer API/status rewrites and frontend status overrides; upstream responses pass through unchanged.

## 0.1.7

- Fix the upstream reboot overlay CSS so `reboot-overlay hidden` is actually hidden; upstream defines `.hidden` before `.reboot-overlay`, so the later overlay `display: flex` rule made the default "Rebooting printer…" overlay visible even when no reboot was running.

## 0.1.6

- Normalize `GET /api/printer/material-station` with no active printer context from upstream `503` to an empty successful status response so the IFS/material-station card does not keep retrying an error state when no printer is configured.

## 0.1.5

- Normalize `GET /api/printer/status` with no active printer context from upstream `503` to an empty successful status response so first-load UI state clears cleanly when no printer is configured.

## 0.1.4

- Clear stale printer status in the browser when FlashForgeWebUI has no active printer context.
- Skip printer feature/camera startup calls when no printer is connected, avoiding a stuck printer-state view on first launch or empty `all-saved-printers` startup.

## 0.1.3

- Mask the `--webui-password` value in add-on startup logs while still passing the real value to FlashForgeWebUI.

## 0.1.2

- Remove the upstream bundled demo printer from persisted state when starting in no-printers mode, preventing a first launch from showing a phantom AD5X printer state.
- Log the effective FlashForgeWebUI startup arguments during add-on startup.

## 0.1.1

- Add Home Assistant add-on icon and logo assets.
- Expose upstream FlashForgeWebUI startup options for `--no-printers`, `--last-used`, `--all-saved-printers`, and `--webui-password`.
- Keep `--printers` and the internal ingress `--webui-port` out of user-facing add-on options.

## 0.1.0

- Initial Home Assistant add-on wrapper for Parallel-7/FlashForgeWebUI pinned to `v1.2.0-alpha.3`.
- Ingress-only add-on metadata for `amd64` and `aarch64`.
- Persistent upstream data directory at `/data`.
- Minimal ingress adapter for prefixed API, WebSocket, static asset, and camera proxy paths.
