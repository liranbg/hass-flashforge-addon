#!/usr/bin/env bash
set -euo pipefail

export DATA_DIR=/data
export NODE_ENV=production
export HASS_INGRESS=true

mkdir -p "$DATA_DIR"
cd /opt/flashforge-webui

exec node ingress-adapter.js
