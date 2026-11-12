'use strict';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: Infinity };
const SECRET_KEY = /(token|secret|password|passwd|api.?key|pairing.?code|authorization|cookie)/i;
const SECRET_TEXT = /(\b(?:authorization|cookie|set-cookie|x-api-key|api[_-]?key|apikey|key|token|secret|password|pairing[_-]?code)\b[\"']?\s*[=:]\s*)(?:\"[^\"]*\"|'[^']*'|[^&\s,;]+)/gi;
function sanitizeText(value) { return String(value).replace(/(\bauthorization\s*[:=]\s*)(?:\"[^\"]*\"|'[^']*'|[^,;\r\n]+)/gi, '$1[REDACTED]').replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]').replace(SECRET_TEXT, '$1[REDACTED]'); }

function redact(value, key = '') {
  if (SECRET_KEY.test(key)) return '[REDACTED]';
  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;
  if (value instanceof Error) return { name: value.name, message: sanitizeText(value.message) };
  if (typeof value === 'string') return sanitizeText(value);
  if (Array.isArray(value)) return value.map(item => redact(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redact(childValue, childKey)]));
  }
  return value;
}

function createLogger({ level = 'info', sink = console } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const logger = {};
  for (const [name, score] of Object.entries(LEVELS)) {
    if (name === 'silent') continue;
    logger[name] = (message, meta) => {
      if (score < threshold) return;
      const output = meta === undefined ? sanitizeText(message) : `${sanitizeText(message)} ${JSON.stringify(redact(meta))}`;
      (name === 'debug' ? sink.debug : sink[name]).call(sink, output);
    };
  }
  return Object.freeze(logger);
}

module.exports = { createLogger, redact };
