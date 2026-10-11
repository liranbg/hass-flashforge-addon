# FlashForge WebUI experimental add-on documentation

This experimental add-on uses upstream FlashForgeWebUI `v1.2.0-alpha.8` and has a separate Home Assistant slug from the regular add-on so both can be installed for comparison.

## What this add-on runs

The add-on starts the upstream FlashForgeWebUI standalone server:

```text
node dist/index.js --webui-port=3000 [configured FlashForgeWebUI options]
```

The add-on always sets the internal `--webui-port` required for Home Assistant ingress. The remaining exposed options map to upstream command-line options: `--no-printers`, `--last-used`, `--all-saved-printers`, and `--webui-password`. `--printers` is intentionally not exposed; add and manage specific printers through the upstream UI. Saved configuration is stored under `/data`.

The experimental `no_auth` option defaults to `false`. When enabled, the wrapper sets upstream `WebUIPasswordRequired` to `false` in `/data/config.json`; when disabled, it preserves an existing upstream value (new installs default to `true`). Other config fields, including the password and printer settings, are retained. Home Assistant Ingress remains the access-control boundary; this option removes only FlashForge WebUI's own password prompt. Do not expose this add-on directly to untrusted networks.

By default, `no_printers` is enabled so the UI starts without connecting to a printer. Disable `no_printers` and enable either `last_used` or `all_saved_printers` if you want automatic printer connections on startup.

## Access

Use the Home Assistant sidebar/ingress entry. There are no default published host ports.

## Printer configuration

Open the add-on UI and use the upstream printer discovery / saved printer management flow. This add-on does not duplicate printer IPs, check codes, models, or camera URLs as Home Assistant add-on options.

## Camera streaming

FlashForgeWebUI uses go2rtc internally. The add-on does not expose the go2rtc API port. Browser camera WebSocket traffic is expected to pass through the authenticated WebUI `/api/camera/ws` proxy.

## Known limitations / live testing required

The repository tests startup, persistence, static assets, API availability, and synthetic ingress-prefixed HTTP paths without connecting to any printer. A real FlashForge printer is required to validate printer discovery, command execution, live status polling, and actual camera video.
