'use strict';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: Infinity };
const SECRET_KEY = /(token|secret|password|passwd|api.?key|pairing.?code|authorization|cookie)/i;
const SECRET_TEXT = /(\b(?:authorization|cookie|set-cookie|x-api-key|api[_-]?key|apikey|key|token|secret|password|pairing[_-]?code)\b["']?\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^&\s,;]+)/gi;

function sanitizeText(value) {
  return String(value)
    .replace(/(\bauthorization\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^,;\r\n]+)/gi, '$1[REDACTED]')
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(/\bBasic\s+[^\s,;]+/gi, 'Basic [REDACTED]')
    .replace(SECRET_TEXT, '$1[REDACTED]');
}

function redact(value, key = '', seen = new WeakSet(), depth = 0) {
  if (SECRET_KEY.test(key)) return '[REDACTED]';
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;
  if (value instanceof Error) {
    const safe = { name: sanitizeText(value.name), message: sanitizeText(value.message) };
    if (value.code !== undefined) safe.code = redact(value.code, 'code', seen, depth + 1);
    if (value.statusCode !== undefined) safe.statusCode = value.statusCode;
    if (value.stack) safe.stack = sanitizeText(value.stack).split('\n').slice(0, 16).join('\n');
    return safe;
  }
  if (typeof value === 'string') return sanitizeText(value);
  if (typeof value !== 'object') return sanitizeText(value);
  if (depth >= 8) return '[MaxDepth]';
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.slice(0, 100).map(item => redact(item, '', seen, depth + 1));
  return Object.fromEntries(Object.entries(value).slice(0, 100).map(([childKey, childValue]) => [childKey, redact(childValue, childKey, seen, depth + 1)]));
}

function createLogger({ level = 'info', sink = console, component = 'BASEBOT' } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const logger = {};
  for (const [name, score] of Object.entries(LEVELS)) {
    if (name === 'silent') continue;
    logger[name] = (message, meta) => {
      if (score < threshold) return;
      const record = {
        timestamp: new Date().toISOString(),
        level: name.toUpperCase(),
        component: sanitizeText(component),
        pid: process.pid,
        message: sanitizeText(message)
      };
      if (meta !== undefined) record.data = redact(meta);
      const output = JSON.stringify(record);
      const writer = typeof sink[name] === 'function' ? sink[name] : sink.log;
      if (typeof writer === 'function') writer.call(sink, output);
    };
  }
  return Object.freeze(logger);
}

module.exports = { createLogger, redact, sanitizeText };
