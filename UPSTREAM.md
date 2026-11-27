# Upstream binary provenance and updates

Upstream moved from [frozen GitHub](https://github.com/Parallel-7/FlashForgeWebUI#readme) to [GitLab](https://gitlab.com/parallel-7/FlashForgeWebUI). Its old GHCR image stops at 1.2.0. This repository's **own** GitHub source, GHCR output images and release workflow do not move.

## Pinned 1.2.1 source

Both Dockerfiles use the official `registry.gitlab.com/parallel-7/flashforgewebui:1.2.1` image as a **binary-only build stage**, not as the runtime base:

- Immutable multi-platform index: `sha256:a1fe43a9270bc6e0d149c5c7140913ada5a667aee71f5ce10abf2f5f7614c8d6`
- Image labels: version `1.2.1`, source `https://gitlab.com/parallel-7/FlashForgeWebUI`, revision `481c136461c15449c570d388612be5919eecea3c`
- Copied path: `/app/flashforge-webui`

| HA architecture | Docker platform | Platform manifest SHA-256 | Copied binary SHA-256 |
| --- | --- | --- | --- |
| `amd64` | `linux/amd64` | `d8655097634e755cfb976e4e550f97e058580dd39ab146992a4379e8965576bb` | `ad9573ee7188697abe196f033ef15fc774664e5e63103e072fe597237090cd10` |
| `aarch64` | `linux/arm64` | `503b30eb451460328d2c724789d60be5c30283f8b8ecfb08f1024f7648eef833` | `51ae59116eeb4e94e933662b571882a2c90e32e2335545db9035beeda1e96f36` |

These checksums were computed from actual bytes copied out of each immutable official image, not invented or taken from an unofficial mirror. `file` identifies the copies as x86-64 and ARM aarch64 ELF binaries respectively. They are **not claimed to be independently verified standalone release-download checksums**: GitLab release API/HTML/browser access returned HTTP 429 during this update. The accessible official registry supplied both actual architecture artifacts and version/source labels instead.

Docker selects the upstream stage using the build's target platform. Existing CI/release matrices set both the Docker platform and `BUILD_ARCH`; a mismatched architecture fails the binary checksum check. The Home Assistant Bookworm base, Node ingress adapter, tini, startup options, `/data`, image paths and permission boundaries stay unchanged. No upstream runtime image configuration, user, entrypoint, volumes or ports are inherited.

Stable advances from upstream 1.1.0 to 1.2.1 (add-on 0.3.0); DEV advances from 1.2.0 to 1.2.1 (add-on 0.3.0-dev.3). DEV keeps its separate slug and intentional opt-in `no_auth` handling. Neither ingress adapter is changed or copied over the other; existing auth and CSS differences are outside this dependency migration.

## Reproduce and update

1. Inspect the official version tag, never `latest`:

   ```sh
   docker manifest inspect registry.gitlab.com/parallel-7/flashforgewebui:1.2.1
   docker pull registry.gitlab.com/parallel-7/flashforgewebui:1.2.1
   ```

   Record the pulled index digest and platform manifest digests. Inspect version/source/revision labels for each platform.
2. Pull each immutable platform manifest, create a stopped container, copy the binary and compute its SHA-256. Example for amd64 (repeat with `linux/arm64` and its manifest for aarch64):

   ```sh
   source=registry.gitlab.com/parallel-7/flashforgewebui@sha256:d8655097634e755cfb976e4e550f97e058580dd39ab146992a4379e8965576bb
   docker pull --platform linux/amd64 "$source"
   docker create --platform linux/amd64 --name flashforge-provenance "$source"
   docker cp flashforge-provenance:/app/flashforge-webui ./flashforge-webui-amd64
   sha256sum ./flashforge-webui-amd64
   file ./flashforge-webui-amd64
   docker rm -v flashforge-provenance
   ```

3. Update both Dockerfile source digests/version labels/checksums, metadata tests, version files, config versions, changelogs and this table together. Do not silently adopt a new toolchain or flatten DEV auth into stable.
4. Run metadata, Node syntax, shellcheck and hadolint gates. Build with matching `--platform`, `BUILD_FROM` and `BUILD_ARCH`, then run `bash tests/smoke.sh <image>` (include `dev` in the DEV image tag). CI runs this for both add-ons on native amd64 and arm64 runners. Smoke containers use `--network none`, no host ports and disposable `/data`; they test ingress-prefixed auth/login, actual JS rewrites, assets, persisted settings and DEV auth across restarts. They do not contact printers or Home Assistant.
5. Open a PR and wait for its exact-head CI. Publication remains a separate authorized release tag/dispatch; a PR is not a deployment.
