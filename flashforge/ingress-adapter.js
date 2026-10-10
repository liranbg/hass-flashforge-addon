'use strict';

const http = require('node:http');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const listenPort = Number(process.env.PORT || 3000);
const backendPort = Number(process.env.FLASHFORGE_BACKEND_PORT || 3001);
const backendHost = '127.0.0.1';
const ingressPattern = /^\/api\/hassio_ingress\/[^/]+(?=\/|$)/;

function readAddonOptions() {
  try {
    return JSON.parse(fs.readFileSync('/data/options.json', 'utf8'));
  } catch (err) {
    console.warn(`[adapter] Could not read /data/options.json, using defaults: ${err.message}`);
    return {};
  }
}

function flashforgeArgs(options) {
  const args = [`--webui-port=${backendPort}`];
  if (options.no_printers !== false) {
    args.push('--no-printers');
  } else if (options.all_saved_printers === true) {
    args.push('--all-saved-printers');
  } else if (options.last_used === true) {
    args.push('--last-used');
  }
  if (typeof options.webui_password === 'string' && options.webui_password.length > 0) {
    args.push(`--webui-password=${options.webui_password}`);
  }
  return args;
}

function maskSensitiveArgs(args) {
  return args.map((arg) => (arg.startsWith('--webui-password=') ? '--webui-password=********' : arg));
}

function removeBundledDemoPrinter(options) {
  if (options.no_printers === false) return;

  const printerDetailsPath = '/data/printer_details.json';
  try {
    const parsed = JSON.parse(fs.readFileSync(printerDetailsPath, 'utf8'));
    const printers = parsed?.printers;
    const printerIds = printers && typeof printers === 'object' ? Object.keys(printers) : [];
    const onlyPrinter = printerIds.length === 1 ? printers[printerIds[0]] : null;

    if (
      parsed?.lastUsedPrinterSerial === 'SNMQRE9400951' &&
      onlyPrinter?.SerialNumber === 'SNMQRE9400951' &&
      onlyPrinter?.IPAddress === '192.168.1.110'
    ) {
      fs.writeFileSync(
        printerDetailsPath,
        `${JSON.stringify({ lastUsedPrinterSerial: null, printers: {} }, null, 2)}\n`
      );
      console.log('[adapter] Removed bundled FlashForgeWebUI demo printer from saved state');
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[adapter] Could not inspect saved printer state: ${err.message}`);
    }
  }
}

function stripIngressPath(url) {
  return url.replace(ingressPattern, '') || '/';
}

function rewriteText(body, contentType) {
  let text = body.toString('utf8');
  if (contentType.includes('text/html')) {
    text = text.replace('href="/favicon.png"', 'href="favicon.png"');
  }
  if (contentType.includes('javascript') || contentType.includes('text/html')) {
    text = text.replace(
      'async function performRequest(endpoint, options = {}) {\n    const { headers, ...rest } = options;\n    const response = await fetch(endpoint, {',
      'function getIngressBasePath() {\n    const match = window.location.pathname.match(/^(\\/api\\/hassio_ingress\\/[^/]+)(?:\\/|$)/);\n    return match ? match[1] : "";\n}\nfunction withIngressBase(endpoint) {\n    return endpoint.startsWith("/") ? `${getIngressBasePath()}${endpoint}` : endpoint;\n}\nasync function performRequest(endpoint, options = {}) {\n    const { headers, ...rest } = options;\n    const response = await fetch(withIngressBase(endpoint), {'
    );
    text = text.replace(
      'const wsUrl = `${protocol}//${window.location.host}/ws${tokenQuery}`;',
      'const wsUrl = `${protocol}//${window.location.host}${getIngressBasePath()}/ws${tokenQuery}`;'
    );
    text = text.replace(
      'const wsUrl = state.authToken\n            ? `${config.wsUrl}&token=${encodeURIComponent(state.authToken)}`\n            : config.wsUrl;',
      'const basePath = window.location.pathname.match(/^(\\/api\\/hassio_ingress\\/[^/]+)(?:\\/|$)/)?.[1] ?? "";\n        const relativeWsUrl = config.wsUrl.startsWith("/") ? `${basePath}${config.wsUrl}` : config.wsUrl;\n        const wsUrl = state.authToken\n            ? `${relativeWsUrl}&token=${encodeURIComponent(state.authToken)}`\n            : relativeWsUrl;'
    );
    text = text.replace(
      'case \'STATUS_UPDATE\':\n            if (message.status) {\n                const status = message.status;\n                statusUpdateCallbacks.forEach((callback) => {\n                    callback(status);\n                });\n            }\n            break;',
      'case \'STATUS_UPDATE\': {\n            const status = message.status ?? null;\n            statusUpdateCallbacks.forEach((callback) => {\n                callback(status);\n            });\n            break;\n        }'
    );
    text = text.replace(
      'await loadPrinterFeatures();\n        await fetchPrinterContexts();\n        await applyUrlPrinterSelection();',
      'await fetchPrinterContexts();\n        if (!getCurrentContextId()) {\n            updatePrinterStatus(null);\n            updateConnectionStatus(false);\n            return;\n        }\n        await loadPrinterFeatures();\n        await applyUrlPrinterSelection();'
    );
  }
  if (contentType.includes('text/css')) {
    text += '\n.reboot-overlay.hidden { display: none !important; }\n';
  }
  return Buffer.from(text, 'utf8');
}

function emptyNoActivePrinterPayload(upstreamPath) {
  switch (upstreamPath) {
    case '/api/printer/status':
    case '/api/printer/material-station':
      return { success: true, status: null };
    default:
      return null;
  }
}

function normalizeNoActivePrinterResponse(upstreamPath, statusCode, headers, body) {
  const emptyPayload = emptyNoActivePrinterPayload(upstreamPath);
  if (!emptyPayload || statusCode !== 503) {
    return { statusCode, headers, body };
  }

  try {
    const parsed = JSON.parse(body.toString('utf8'));
    if (parsed?.success === false && parsed?.error === 'No active printer context') {
      const normalizedBody = Buffer.from(JSON.stringify(emptyPayload), 'utf8');
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'content-type': 'application/json; charset=utf-8',
        },
        body: normalizedBody,
      };
    }
  } catch {
    // Leave non-JSON or unexpected responses unchanged.
  }

  return { statusCode, headers, body };
}

function proxyHttp(req, res) {
  const upstreamPath = stripIngressPath(req.url || '/');
  const headers = { ...req.headers, host: `${backendHost}:${backendPort}` };
  const upstream = http.request(
    { hostname: backendHost, port: backendPort, path: upstreamPath, method: req.method, headers },
    (upstreamRes) => {
      const chunks = [];
      upstreamRes.on('data', (chunk) => chunks.push(chunk));
      upstreamRes.on('end', () => {
        const contentType = String(upstreamRes.headers['content-type'] || '');
        let body = Buffer.concat(chunks);
        const headers = { ...upstreamRes.headers };
        delete headers['content-length'];
        if (
          contentType.includes('text/html') ||
          contentType.includes('javascript') ||
          contentType.includes('text/css')
        ) {
          body = rewriteText(body, contentType);
        }
        const normalized = normalizeNoActivePrinterResponse(
          upstreamPath,
          upstreamRes.statusCode || 502,
          headers,
          body
        );
        res.writeHead(normalized.statusCode, normalized.headers);
        res.end(normalized.body);
      });
    }
  );
  upstream.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`FlashForge backend unavailable: ${err.message}\n`);
  });
  req.pipe(upstream);
}

const addonOptions = readAddonOptions();
removeBundledDemoPrinter(addonOptions);
const childArgs = flashforgeArgs(addonOptions);
console.log(`[adapter] Starting FlashForgeWebUI with args: ${maskSensitiveArgs(childArgs).join(' ')}`);

const child = spawn('./flashforge-webui', childArgs, {
  cwd: '/opt/flashforge-webui',
  env: { ...process.env, DATA_DIR: process.env.DATA_DIR || '/data' },
  stdio: ['ignore', 'inherit', 'inherit'],
});
child.on('exit', (code, signal) => {
  console.error(`[adapter] FlashForgeWebUI exited code=${code} signal=${signal}`);
  process.exit(code || 1);
});

const server = http.createServer(proxyHttp);
server.on('upgrade', (req, clientSocket, head) => {
  req.url = stripIngressPath(req.url || '/');
  const headers = Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n');
  const upstreamSocket = require('node:net').connect(backendPort, backendHost, () => {
    upstreamSocket.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${headers}\r\n\r\n`);
    if (head.length > 0) upstreamSocket.write(head);
    upstreamSocket.pipe(clientSocket);
    clientSocket.pipe(upstreamSocket);
  });
  upstreamSocket.on('error', () => clientSocket.destroy());
});

server.listen(listenPort, '0.0.0.0', () => {
  console.log(`[adapter] listening on ${listenPort}, proxying FlashForgeWebUI on ${backendPort}`);
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  child.kill('SIGINT');
  server.close(() => process.exit(0));
});
