ARG BUILD_FROM=ghcr.io/home-assistant/aarch64-base-debian:bookworm

# Docker selects the target platform from this immutable multi-architecture index.
# Only the upstream binary is copied; retain the Home Assistant base and wrapper.
FROM registry.gitlab.com/parallel-7/flashforgewebui:1.2.1@sha256:a1fe43a9270bc6e0d149c5c7140913ada5a667aee71f5ce10abf2f5f7614c8d6 AS upstream

FROM ${BUILD_FROM}

ARG BUILD_ARCH
ARG BUILD_VERSION=dev
ARG FLASHFORGE_REF=v1.2.1

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
COPY --from=upstream /app/flashforge-webui ./flashforge-webui
RUN set -euo pipefail; \
  case "${BUILD_ARCH}" in \
    amd64) sha="ad9573ee7188697abe196f033ef15fc774664e5e63103e072fe597237090cd10" ;; \
    aarch64) sha="51ae59116eeb4e94e933662b571882a2c90e32e2335545db9035beeda1e96f36" ;; \
    *) echo "Unsupported BUILD_ARCH=${BUILD_ARCH}" >&2; exit 1 ;; \
  esac; \
  echo "${sha}  flashforge-webui" | sha256sum -c -; \
  chmod +x flashforge-webui
COPY ingress-adapter.js ./ingress-adapter.js
COPY log-filter.js ./log-filter.js
COPY run.sh /run.sh
RUN chmod +x /run.sh && mkdir -p /data

ENV DATA_DIR=/data \
    NODE_ENV=production \
    HASS_INGRESS=true

HEALTHCHECK --interval=30s --timeout=5s CMD ["curl", "-fsS", "http://127.0.0.1:3000/api/auth/status"]

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/run.sh"]
