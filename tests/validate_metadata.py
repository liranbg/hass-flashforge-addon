import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parents[1]
repo_text = (root / 'repository.yaml').read_text()
errors = []

ADDONS = {
    'flashforge': {
        'slug': 'flashforge_webui',
        'image': 'ghcr.io/liranbg/hass-flashforge-addon/{arch}',
        'version': '0.3.0',
    },
    'flashforge-dev': {
        'slug': 'flashforge_webui_experimental',
        'image': 'ghcr.io/liranbg/hass-flashforge-addon/dev/{arch}',
        'version': '0.4.0-dev.2',
    },
}


def scalar(text, key):
    m = re.search(rf'^{re.escape(key)}:\s*"?([^"\n]+)"?\s*$', text, re.M)
    return m.group(1).strip() if m else None


def list_block(text, key):
    m = re.search(rf'^{re.escape(key)}:\n((?:\s+-\s+[^\n]+\n)+)', text, re.M)
    if not m:
        return []
    return [line.split('-', 1)[1].strip() for line in m.group(1).splitlines()]


if scalar(repo_text, 'url') != 'https://github.com/liranbg/hass-flashforge-addon':
    errors.append('repository url mismatch')

for addon_dir, expected_meta in ADDONS.items():
    addon_path = root / addon_dir
    config_text = (addon_path / 'config.yaml').read_text()
    label = f'{addon_dir}: '
    dockerfile = (addon_path / 'Dockerfile').read_text()
    if 'ARG FLASHFORGE_REF=v1.2.1\n' not in dockerfile:
        errors.append(label + 'upstream must be pinned to v1.2.1')
    upstream_source = (
        'registry.gitlab.com/parallel-7/flashforgewebui:1.2.1@sha256:'
        'a1fe43a9270bc6e0d149c5c7140913ada5a667aee71f5ce10abf2f5f7614c8d6'
    )
    if f'FROM {upstream_source} AS upstream' not in dockerfile:
        errors.append(label + 'upstream must use the immutable official GitLab v1.2.1 index')
    if 'COPY --from=upstream /app/flashforge-webui ./flashforge-webui' not in dockerfile:
        errors.append(label + 'copy only the binary, preserving the Home Assistant runtime')
    if 'releases/download/' in dockerfile:
        errors.append(label + 'must not fetch binaries from frozen GitHub releases')
    for arch, checksum in {
        'amd64': 'ad9573ee7188697abe196f033ef15fc774664e5e63103e072fe597237090cd10',
        'aarch64': '51ae59116eeb4e94e933662b571882a2c90e32e2335545db9035beeda1e96f36',
    }.items():
        if f'{arch}) sha="{checksum}"' not in dockerfile:
            errors.append(label + f'missing verified binary checksum for {arch}')
    if 'sha256sum -c -' not in dockerfile:
        errors.append(label + 'downloaded binary checksum must be verified')

    if scalar(config_text, 'slug') != expected_meta['slug']:
        errors.append(label + 'unexpected add-on slug')
    if scalar(config_text, 'image') != expected_meta['image']:
        errors.append(label + 'image pattern mismatch')
    if scalar(config_text, 'version') != expected_meta['version']:
        errors.append(label + 'unexpected version')
    if (addon_path / 'VERSION').read_text().strip() != scalar(config_text, 'version'):
        errors.append(label + 'VERSION does not match config.yaml')
    if list_block(config_text, 'arch') != ['amd64', 'aarch64']:
        errors.append(label + 'architecture list mismatch')
    if not re.search(r'^ports:\s*\{\}\s*$', config_text, re.M):
        errors.append(label + 'host ports must not be published')
    for forbidden in [
        'hassio_api',
        'homeassistant_api',
        'auth_api',
        'hassio_role',
        'privileged',
        'full_access',
        'host_network',
    ]:
        if re.search(rf'^{forbidden}:', config_text, re.M):
            errors.append(label + f'forbidden key present: {forbidden}')
    if scalar(config_text, 'ingress') != 'true' or scalar(config_text, 'ingress_port') != '3000':
        errors.append(label + 'ingress configuration mismatch')
    if scalar(config_text, 'watchdog') != 'http://[HOST]:[PORT:3000]/api/auth/status':
        errors.append(label + 'watchdog URL mismatch')
    translation_path = addon_path / 'translations' / 'en.yaml'
    if not translation_path.is_file():
        errors.append(label + 'missing translations/en.yaml')
    else:
        translation_text = translation_path.read_text()
        for option_key in ['no_printers', 'last_used', 'all_saved_printers', 'webui_password']:
            if f'  {option_key}:' not in translation_text:
                errors.append(label + f'missing translation for {option_key}')
        if addon_dir == 'flashforge-dev' and '  no_auth:' not in translation_text:
            errors.append(label + 'missing translation for no_auth')
    adapter_text = (addon_path / 'ingress-adapter.js').read_text()
    if "contentType.includes('text/css')" not in adapter_text:
        errors.append(label + 'ingress-adapter.js must rewrite text/css responses')
    expected_options = [
        'no_printers: true',
        'last_used: false',
        'all_saved_printers: false',
        'webui_password: ""',
        'no_printers: bool',
        'last_used: bool',
        'all_saved_printers: bool',
        'webui_password: password',
    ]
    if addon_dir == 'flashforge-dev':
        expected_options.extend(['no_auth: false', 'no_auth: bool', 'debug_logs: false', 'debug_logs: bool'])
    for expected in expected_options:
        if expected not in config_text:
            errors.append(label + f'missing add-on option/schema: {expected}')

if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)
print('metadata ok')
