import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parents[1]
config_text = (root / 'flashforge' / 'config.yaml').read_text()
repo_text = (root / 'repository.yaml').read_text()
errors = []

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
if scalar(config_text, 'slug') != 'flashforge_webui':
    errors.append('unexpected add-on slug')
if scalar(config_text, 'image') != 'ghcr.io/liranbg/hass-flashforge-addon/{arch}':
    errors.append('image pattern mismatch')
if list_block(config_text, 'arch') != ['amd64', 'aarch64']:
    errors.append('architecture list mismatch')
if not re.search(r'^ports:\s*\{\}\s*$', config_text, re.M):
    errors.append('host ports must not be published')
for forbidden in ['hassio_api', 'homeassistant_api', 'auth_api', 'hassio_role', 'privileged', 'full_access', 'host_network']:
    if re.search(rf'^{forbidden}:', config_text, re.M):
        errors.append(f'forbidden key present: {forbidden}')
if scalar(config_text, 'ingress') != 'true' or scalar(config_text, 'ingress_port') != '3000':
    errors.append('ingress configuration mismatch')
if not re.search(r'^options:\s*\{\}\s*$', config_text, re.M) or not re.search(r'^schema:\s*\{\}\s*$', config_text, re.M):
    errors.append('add-on options/schema should remain empty')
if (root / 'flashforge' / 'VERSION').read_text().strip() != scalar(config_text, 'version'):
    errors.append('VERSION does not match config.yaml')

if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)
print('metadata ok')
