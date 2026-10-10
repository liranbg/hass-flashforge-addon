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
  }
  return Buffer.from(text, 'utf8');
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
        if (contentType.includes('text/html') || contentType.includes('javascript')) {
          body = rewriteText(body, contentType);
        }
        res.writeHead(upstreamRes.statusCode || 502, headers);
        res.end(body);
      });
    }
  );
  upstream.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`FlashForge backend unavailable: ${err.message}\n`);
  });
  req.pipe(upstream);
}

const child = spawn('./flashforge-webui', flashforgeArgs(readAddonOptions()), {
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
