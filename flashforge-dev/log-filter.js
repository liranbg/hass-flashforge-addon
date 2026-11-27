'use strict';

const routinePatterns = [
  /handlePollingUpdate called/,
  /Calling webSocketManager\.broadcastPrinterStatus/,
  /broadcastPrinterStatus called/,
  /Broadcasting status update to/,
  /Forwarded polling data for context/,
  /Converting decimal progress/,
  /Layer progress:/,
  /sendCommand:\s*~M27\b/,
  /CheckSocket\(\)/,
  /\[WebUI\] (?:GET|HEAD) \/printer\/(?:material-station|status)\b.*\b(?:200|304)\b/,
];

function keepLine(line, debug) {
  if (debug) return true;
  return !routinePatterns.some((pattern) => pattern.test(line));
}

module.exports = { keepLine };
