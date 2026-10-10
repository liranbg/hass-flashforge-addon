ARG BUILD_FROM=ghcr.io/home-assistant/aarch64-base-debian:bookworm

FROM ${BUILD_FROM}

ARG BUILD_ARCH
ARG BUILD_VERSION=dev
ARG FLASHFORGE_REF=v1.2.0-alpha.3

LABEL io.hass.version="${BUILD_VERSION}" \
      io.hass.type="addon" \
      io.hass.arch="${BUILD_ARCH}" \
      org.opencontainers.image.source="https://github.com/liranbg/hass-flashforge-addon" \
      org.opencontainers.image.description="Home Assistant add-on wrapper for Parallel-7 FlashForgeWebUI" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${BUILD_VERSION}" \
      org.opencontainers.image.revision="${FLASHFORGE_REF}"

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# hadolint ignore=DL3008
RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates curl nodejs tini \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/flashforge-webui
RUN set -euo pipefail; \
  case "${BUILD_ARCH}" in \
    amd64) asset="flashforge-webui-linux-x64.bin"; sha="ff22b0d62d33df70185ad80fd595cf9e14b4063cd47f7b523aaa031e0d80a1d3" ;; \
    aarch64) asset="flashforge-webui-linux-arm64.bin"; sha="05b35967e0d13a7b182e809f917656145473c122df5b25479ad3d4da193c9959" ;; \
    *) echo "Unsupported BUILD_ARCH=${BUILD_ARCH}" >&2; exit 1 ;; \
  esac; \
  curl -fsSL -o flashforge-webui "https://github.com/Parallel-7/FlashForgeWebUI/releases/download/${FLASHFORGE_REF}/${asset}"; \
  echo "${sha}  flashforge-webui" | sha256sum -c -; \
  chmod +x flashforge-webui
COPY ingress-adapter.js ./ingress-adapter.js
COPY run.sh /run.sh
RUN chmod +x /run.sh && mkdir -p /data

ENV DATA_DIR=/data \
    NODE_ENV=production \
    HASS_INGRESS=true

HEALTHCHECK --interval=30s --timeout=5s CMD ["curl", "-fsS", "http://127.0.0.1:3000/api/auth/status"]

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/run.sh"]
