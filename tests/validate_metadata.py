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
        'version': '0.2.0',
    },
    'flashforge-dev': {
        'slug': 'flashforge_webui_experimental',
        'image': 'ghcr.io/liranbg/hass-flashforge-addon/dev/{arch}',
        'version': '0.3.0-dev.1',
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
        expected_options.extend(['no_auth: false', 'no_auth: bool'])
    for expected in expected_options:
        if expected not in config_text:
            errors.append(label + f'missing add-on option/schema: {expected}')

if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)
print('metadata ok')
