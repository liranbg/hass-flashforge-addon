const assert = require('node:assert/strict');
const { keepLine } = require('../flashforge-dev/log-filter');

const routine = [
  '[WebUIManager] handlePollingUpdate called, hasStatus: true contextId: context-1 wsManager: true',
  '[WebSocketManager] broadcastPrinterStatus called - context: context-1, running: true, clients: 1, hasData: true',
  '[Events] Forwarded polling data for context: context-1',
  '[DataTransformer] Converting decimal progress: 0.1 → 10%',
  '[DataTransformer] Layer progress: 40/444',
  'sendCommand: ~M27 CheckSocket()',
  '[WebUI] GET /printer/material-station - 304 (3ms)',
];
assert.equal(routine.every((line) => !keepLine(line, false)), true);

const important = [
  '[adapter] Starting FlashForgeWebUI with args: --webui-port=3001',
  '[WebUI] GET /api/auth/login - 401 (4ms)',
  '[Printer] Connection failed: timeout',
  'Error: backend unavailable',
];
assert.equal(important.every((line) => keepLine(line, false)), true);
assert.equal(keepLine(routine[0], true), true);
console.log('log filter tests ok');
