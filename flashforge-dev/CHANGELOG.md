# Changelog

## 0.3.0-dev.1

- Bump the experimental add-on version for the next development release.

## 0.3.0-dev.0

- Move experimental add-on to upstream latest release `v1.2.0-alpha.8`.
- Retain the CSS fix that hides the reboot overlay when it has the `hidden` class.
- Keep upstream no-active-printer responses and UI behavior unchanged; no 503/status overrides are applied.

## 0.2.0-dev.0

- Experimental parallel add-on with a separate Home Assistant slug so it can be installed next to the regular add-on.
- Use incrementable dev release versions (`0.2.0-dev.N`) so Home Assistant can surface experimental updates over time.
- Start from the `0.1.3` wrapper behavior, keeping ingress support, startup options, demo-printer cleanup, and masked password logging while dropping the later no-printer 503 response rewrites.

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
