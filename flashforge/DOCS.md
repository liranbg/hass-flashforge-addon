# FlashForge WebUI add-on documentation

## What this add-on runs

The add-on starts the upstream FlashForgeWebUI standalone server:

```text
node dist/index.js --no-printers --webui-port=3000
```

`--no-printers` is intentional: the UI remains available through Home Assistant ingress and printers are added/configured through the upstream UI. Saved configuration is stored under `/data`.

## Access

Use the Home Assistant sidebar/ingress entry. There are no default published host ports.

## Printer configuration

Open the add-on UI and use the upstream printer discovery / saved printer management flow. This add-on does not duplicate printer IPs, check codes, models, or camera URLs as Home Assistant add-on options.

## Camera streaming

FlashForgeWebUI uses go2rtc internally. The add-on does not expose the go2rtc API port. Browser camera WebSocket traffic is expected to pass through the authenticated WebUI `/api/camera/ws` proxy.

## Known limitations / live testing required

The repository tests startup, persistence, static assets, API availability, and synthetic ingress-prefixed HTTP paths without connecting to any printer. A real FlashForge printer is required to validate printer discovery, command execution, live status polling, and actual camera video.
