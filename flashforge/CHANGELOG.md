# Changelog

## 0.1.1

- Add Home Assistant add-on icon and logo assets.
- Expose upstream FlashForgeWebUI startup options for `--no-printers`, `--last-used`, `--all-saved-printers`, and `--webui-password`.
- Keep `--printers` and the internal ingress `--webui-port` out of user-facing add-on options.

## 0.1.0

- Initial Home Assistant add-on wrapper for Parallel-7/FlashForgeWebUI pinned to `v1.2.0-alpha.3`.
- Ingress-only add-on metadata for `amd64` and `aarch64`.
- Persistent upstream data directory at `/data`.
- Minimal ingress adapter for prefixed API, WebSocket, static asset, and camera proxy paths.
