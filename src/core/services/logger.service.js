'use strict';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: Infinity };
const SECRET_KEY = /(token|secret|password|passwd|api.?key|pairing.?code|authorization|cookie|^(?:me|jid|remotejid|chatid|participant|participantjid|phone|phonenumber|pushname|sender|chat)$)/i;
const SECRET_TEXT = /(\b(?:authorization|cookie|set-cookie|x-api-key|api[_-]?key|apikey|key|token|secret|password|pairing[_-]?code)\b["']?\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^&\s,;]+)/gi;
const ANSI = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  teal: '\x1b[38;2;45;212;191m', blue: '\x1b[38;2;96;165;250m', violet: '\x1b[38;2;167;139;250m',
  green: '\x1b[38;2;74;222;128m', yellow: '\x1b[38;2;251;191;36m', red: '\x1b[38;2;248;113;113m', gray: '\x1b[38;2;148;163;184m', white: '\x1b[38;2;241;245;249m'
};
const LEVEL_STYLE = { debug: ['DBG', ANSI.gray], info: ['INFO', ANSI.blue], warn: ['WARN', ANSI.yellow], error: ['ERROR', ANSI.red] };
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

function sanitizeText(value) {
  return String(value)
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(CONTROL_CHARS, '')
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

function stripAnsi(value) { return String(value).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, ''); }
function visibleWidth(value) {
  return Array.from(stripAnsi(value)).reduce((width, char) => {
    // Termux commonly renders these Unicode ranges as two terminal cells.
    return width + (/[[\\u1100-\\u115F\\u2E80-\\uA4CF\\uAC00-\\uD7A3\\uF900-\\uFAFF\\uFE10-\\uFE6F\\uFF00-\\uFF60\\uFFE0-\\uFFE6]]/u.test(char) ? 2 : 1);
  }, 0);
}
function padVisible(value, width) {
  const text = String(value);
  return text + ' '.repeat(Math.max(0, width - visibleWidth(text)));
}
function terminalWidth() {
  const columns = Number(process.stdout.columns);
  return Number.isFinite(columns) && columns >= 48 ? Math.min(columns, 100) : 80;
}
function fitVisible(value, width) {
  const text = String(value);
  if (visibleWidth(text) <= width) return text;
  let output = '';
  let used = 0;
  for (const char of Array.from(text)) {
    const size = visibleWidth(char);
    if (used + size > Math.max(0, width - 1)) break;
    output += char;
    used += size;
  }
  return `${output}…`;
}
function clip(value, max = 68) {
  const text = sanitizeText(value).replace(/[\r\n]+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
function shortTime(date) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
}
function colorize(enabled, color, value, bold = false) {
  const text = String(value);
  if (!enabled) return text;
  return `${bold ? ANSI.bold : ''}${color}${text}${ANSI.reset}`;
}

function createLogger({ level = 'info', sink = console, component = 'BASEBOT', format = 'json', colors, clock = () => new Date() } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const pretty = format === 'pretty';
  const colorEnabled = colors === undefined ? Boolean(sink === console && process.stdout.isTTY && !process.env.NO_COLOR) : Boolean(colors);
  const logger = {};

  function writeLine(line, method = 'log') {
    const writer = typeof sink[method] === 'function' ? sink[method] : sink.log;
    if (typeof writer === 'function') writer.call(sink, line);
  }

  function record(name, message, meta) {
    const data = meta === undefined ? undefined : redact(meta);
    if (!pretty) {
      const entry = { timestamp: clock().toISOString(), level: name.toUpperCase(), component: sanitizeText(component), pid: process.pid, message: sanitizeText(message) };
      if (data !== undefined) entry.data = data;
      writeLine(JSON.stringify(entry), name);
      return;
    }
    const [label, color] = LEVEL_STYLE[name] || LEVEL_STYLE.info;
    const prefix = `${colorize(colorEnabled, ANSI.gray, shortTime(clock()))} ${colorize(colorEnabled, color, padVisible(label, 5), true)} ${colorize(colorEnabled, ANSI.gray, '›')} ${colorize(colorEnabled, ANSI.white, clip(message, 150))}`;
    const suffix = data === undefined ? '' : ` ${colorize(colorEnabled, ANSI.gray, formatMeta(data))}`;
    writeLine(`${prefix}${suffix}`, name);
  }

  function formatMeta(data) {
    let text;
    try { text = JSON.stringify(data); } catch { text = '[Unserializable metadata]'; }
    return clip(text, 900);
  }

  for (const [name, score] of Object.entries(LEVELS)) {
    if (name === 'silent') continue;
    logger[name] = (message, meta) => { if (score >= threshold) record(name, message, meta); };
  }

  logger.banner = info => {
    const name = clip(info?.name || 'BASEBOT', 32).toUpperCase();
    const version = clip(info?.version || '', 20);
    const mode = clip(String(info?.mode || 'public').toUpperCase(), 16);
    const node = clip(info?.node || process.version, 20);
    const width = Math.max(42, Math.min(64, terminalWidth() - 6));
    const edge = colorize(colorEnabled, ANSI.teal, `  ╭${'─'.repeat(width)}╮`, true);
    const bottom = colorize(colorEnabled, ANSI.teal, `  ╰${'─'.repeat(width)}╯`, true);
    const border = colorize(colorEnabled, ANSI.teal, '  │', true);
    const rightBorder = colorize(colorEnabled, ANSI.teal, '│', true);
    const title = fitVisible(`  ${name}  ${colorize(colorEnabled, ANSI.violet, `v${version}`)}  ${colorize(colorEnabled, ANSI.gray, '·')}  ${colorize(colorEnabled, ANSI.white, 'PLUGIN WHATSAPP FRAMEWORK', true)}`, width);
    const details = fitVisible(`  ${colorize(colorEnabled, ANSI.gray, 'NODE')} ${node}   ${colorize(colorEnabled, ANSI.gray, 'MODE')} ${colorize(colorEnabled, info?.mode === 'public' ? ANSI.green : ANSI.yellow, mode, true)}   ${colorize(colorEnabled, ANSI.gray, 'PREFIX')} ${clip(info?.prefix || '.', 8)}`, width);
    if (pretty) writeLine(`\n${edge}\n${border}${padVisible(title, width)}${rightBorder}\n${border}${padVisible(details, width)}${rightBorder}\n${bottom}`);
    else record('info', 'Runtime banner.', info);
  };

  logger.plugins = summary => {
    if (!pretty) return record('info', 'Plugin registry siap.', summary);
    const loaded = Number(summary?.loaded || 0);
    const discovered = Number(summary?.discovered || 0);
    const commands = Number(summary?.commands || 0);
    const skipped = Number(summary?.skipped || 0);
    const status = skipped ? `${skipped} FAILED` : 'ALL READY';
    const color = skipped ? ANSI.yellow : ANSI.green;
    const details = `${loaded}/${discovered} plugins  ·  ${commands} commands  ·  ${status}`;
    writeLine(`  ${colorize(colorEnabled, ANSI.teal, '◆', true)} ${colorize(colorEnabled, ANSI.white, 'PLUGIN ECOSYSTEM', true)} ${colorize(colorEnabled, color, details, true)}`);
    const names = Array.isArray(summary?.plugins) ? summary.plugins.slice(0, 12).map(name => clip(name, 24)).join('  ·  ') : '';
    if (names) writeLine(`    ${colorize(colorEnabled, ANSI.gray, names)}`);
  };

  logger.connection = (status, details = {}) => {
    const map = {
      open: ['CONNECTED', ANSI.green, '●'], connected: ['CONNECTED', ANSI.green, '●'],
      connecting: ['CONNECTING', ANSI.blue, '◌'], close: ['DISCONNECTED', ANSI.red, '○'],
      disconnected: ['DISCONNECTED', ANSI.red, '○'], closing: ['CLOSING', ANSI.yellow, '◌']
    };
    const [label, color, icon] = map[String(status).toLowerCase()] || ['CONNECTION', ANSI.blue, '●'];
    if (!pretty) return record(status === 'close' ? 'warn' : 'info', `WhatsApp ${label.toLowerCase()}.`, { status, ...details });
    const safeDetails = redact(details);
    const panelWidth = Math.max(38, Math.min(58, terminalWidth() - 8));
    writeLine(`\n  ${colorize(colorEnabled, ANSI.teal, '╭─', true)} ${colorize(colorEnabled, color, `${icon} ${label}`, true)} ${colorize(colorEnabled, ANSI.gray, '─'.repeat(Math.max(8, panelWidth - 12)))}`);
    for (const [key, value] of Object.entries(safeDetails || {})) {
      if (value === undefined || value === false || value === '') continue;
      writeLine(`  ${colorize(colorEnabled, ANSI.teal, '│')} ${colorize(colorEnabled, ANSI.gray, padVisible(`${clip(key, 26)}:`, 28))} ${colorize(colorEnabled, ANSI.white, clip(typeof value === 'object' ? JSON.stringify(value) : value, 70))}`);
    }
    writeLine(`  ${colorize(colorEnabled, ANSI.teal, '╰' + '─'.repeat(panelWidth), true)}`);
  };

  logger.activity = info => {
    const data = redact(info || {});
    if (!pretty) return record('info', 'Command selesai.', data);
    const command = clip(data.command || 'unknown', 30);
    const plugin = clip(data.plugin || 'plugin', 28);
    const category = data.category ? ` ${colorize(colorEnabled, ANSI.gray, `[${clip(data.category, 18)}]`)}` : '';
    const scope = clip(String(data.scope || 'chat').toUpperCase(), 12);
    const elapsed = Number.isFinite(data.durationMs) ? `${Math.max(0, data.durationMs)}ms` : '';
    writeLine(`  ${colorize(colorEnabled, ANSI.violet, '↳', true)} ${colorize(colorEnabled, ANSI.white, `.${command}`, true)} ${colorize(colorEnabled, ANSI.gray, '→')} ${colorize(colorEnabled, ANSI.teal, plugin)}${category} ${colorize(colorEnabled, ANSI.gray, `[${scope}] ${elapsed}`)}`);
  };

  return Object.freeze(logger);
}

module.exports = { createLogger, redact, sanitizeText, stripAnsi };
