'use strict';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: Infinity };
const SECRET_KEY = /(token|secret|password|passwd|api.?key|pairing.?code|authorization|cookie|^(?:me|jid|remotejid|chatid|participant|participantjid|phone|phonenumber|pushname|sender|chat)$/i;
const SECRET_TEXT = /(\b(?:authorization|cookie|set-cookie|x-api-key|api[_-]?key|apikey|key|token|secret|password|pairing[_-]?code)\b["']?\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^&\s,;]+)/gi;
const ANSI = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  teal: '\x1b[38;2;34;211;238m', blue: '\x1b[38;2;96;165;250m', violet: '\x1b[38;2;168;85;247m',
  green: '\x1b[38;2;52;211;153m', yellow: '\x1b[38;2;251;191;36m', red: '\x1b[38;2;248;113;113m',
  gray: '\x1b[38;2;156;163;175m', white: '\x1b[38;2;248;250;252m', pink: '\x1b[38;2;244;114;182m',
  orange: '\x1b[38;2;251;146;60m', lime: '\x1b[38;2;163;230;53m', border: '\x1b[38;2;55;65;81m'
};
const LEVEL_STYLE = {
  debug: ['DEBUG', ANSI.gray], info: ['INFO', ANSI.blue], success: ['SUCCESS', ANSI.green],
  warn: ['WARN', ANSI.yellow], error: ['ERROR', ANSI.red], system: ['SYSTEM', ANSI.violet]
};
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const TYPE_MAP = {
  imageMessage: ['IMAGE', ANSI.green], videoMessage: ['VIDEO', ANSI.blue],
  audioMessage: ['AUDIO', ANSI.violet], stickerMessage: ['STICKER', ANSI.yellow],
  documentMessage: ['DOCUMENT', ANSI.red], contactMessage: ['CONTACT', ANSI.violet],
  locationMessage: ['LOCATION', ANSI.green], liveLocationMessage: ['LIVE LOCATION', ANSI.green],
  viewOnceMessageV2: ['VIEW ONCE', ANSI.orange], extendedTextMessage: ['TEXT', ANSI.gray],
  conversation: ['TEXT', ANSI.gray], interactiveResponseMessage: ['INTERACTIVE', ANSI.teal],
  pollCreationMessage: ['POLL', ANSI.orange], reactionMessage: ['REACTION', ANSI.pink]
};

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
  if (Buffer.isBuffer(value)) return '[Buffer ' + value.length + ' bytes]';
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
  return Array.from(stripAnsi(value)).reduce((width, char) => width + (/[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/u.test(char) ? 2 : 1), 0);
}
function padVisible(value, width) { const text = String(value); return text + ' '.repeat(Math.max(0, width - visibleWidth(text))); }
function terminalWidth() {
  const columns = Number(process.stdout.columns);
  return Number.isFinite(columns) && columns >= 48 ? Math.min(columns, 100) : 80;
}
function fitVisible(value, width) {
  const text = String(value);
  if (visibleWidth(text) <= width) return text;
  let output = ''; let used = 0;
  for (const char of Array.from(text)) {
    const size = visibleWidth(char);
    if (used + size > Math.max(0, width - 1)) break;
    output += char; used += size;
  }
  return output + '…';
}
function clip(value, max = 68) {
  const text = sanitizeText(value).replace(/[\r\n]+/g, ' ').trim();
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}
function shortTime(date, timezone = 'Asia/Jakarta') {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: timezone, day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
  }
}
function colorize(enabled, color, value, bold = false) {
  const text = String(value);
  if (!enabled) return text;
  return (bold ? ANSI.bold : '') + color + text + ANSI.reset;
}
function safeStringify(value) {
  try { return JSON.stringify(redact(value)); } catch { return '"[Unserializable metadata]"'; }
}

function createLogger({ level = 'info', sink = console, component = 'BASEBOT', format = 'json', colors, clock = () => new Date(), timezone = 'Asia/Jakarta' } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const pretty = format === 'pretty';
  const colorEnabled = colors === undefined ? Boolean(sink === console && process.stdout.isTTY && !process.env.NO_COLOR) : Boolean(colors);
  const logger = {};

  function writeLine(line, method = 'log') {
    const writer = typeof sink[method] === 'function' ? sink[method] : sink.log;
    if (typeof writer === 'function') writer.call(sink, line);
  }
  function record(name, message, meta, forcePretty = false) {
    const data = meta === undefined ? undefined : redact(meta);
    if (!pretty && !forcePretty) {
      const entry = { timestamp: clock().toISOString(), level: name.toUpperCase(), component: sanitizeText(component), pid: process.pid, message: sanitizeText(message) };
      if (data !== undefined) entry.data = data;
      writeLine(JSON.stringify(entry), name === 'success' || name === 'system' ? 'info' : name);
      return;
    }
    const [label, color] = LEVEL_STYLE[name] || LEVEL_STYLE.info;
    const prefix = colorize(colorEnabled, ANSI.gray, shortTime(clock(), timezone)) + ' ' +
      colorize(colorEnabled, color, padVisible(label, 7), true) + ' ' +
      colorize(colorEnabled, ANSI.violet, '›') + ' ' +
      colorize(colorEnabled, ANSI.white, clip(message, 150));
    const suffix = data === undefined ? '' : ' ' + colorize(colorEnabled, ANSI.gray, clip(safeStringify(data), 900));
    writeLine(prefix + suffix, name === 'success' || name === 'system' ? 'info' : name);
  }
  function panelLine(text) { writeLine(text); }
  function border(width, left, right) {
    return colorize(colorEnabled, ANSI.border, left + '─'.repeat(width) + right, true);
  }

  for (const [name, score] of Object.entries(LEVELS)) {
    if (name === 'silent') continue;
    logger[name] = (message, meta) => { if (score >= threshold) record(name, message, meta); };
  }

  logger.success = (label, detail = '', meta) => {
    if (LEVELS.info < threshold) return;
    record('success', detail ? clip(label, 48) + ': ' + detail : label, meta);
  };
  logger.system = (label, detail = '', meta) => {
    if (LEVELS.info < threshold) return;
    record('system', detail ? clip(label, 48) + ': ' + detail : label, meta);
  };
  logger.tag = (label, message, detail = '') => {
    if (LEVELS.info < threshold) return;
    record('info', '[' + clip(label, 24) + '] ' + message + (detail ? ' ' + detail : ''));
  };
  logger.divider = () => panelLine(colorize(colorEnabled, ANSI.border, '  ' + '─'.repeat(Math.max(32, Math.min(terminalWidth() - 4, 76)))));
  logger.banner = info => {
    const name = clip(info?.name || 'BASEBOT', 32).toUpperCase();
    const version = clip(info?.version || '', 20);
    const mode = clip(String(info?.mode || 'public').toUpperCase(), 16);
    const node = clip(info?.node || process.version, 20);
    const prefix = clip(info?.prefix || '.', 8);
    const width = Math.max(42, Math.min(64, terminalWidth() - 6));
    const title = fitVisible('  ' + name + '  ' + colorize(colorEnabled, ANSI.violet, 'v' + version) + '  ' + colorize(colorEnabled, ANSI.gray, '·') + '  ' + colorize(colorEnabled, ANSI.white, 'PLUGIN WHATSAPP FRAMEWORK', true), width);
    const details = fitVisible('  ' + colorize(colorEnabled, ANSI.gray, 'NODE') + ' ' + node + '   ' + colorize(colorEnabled, ANSI.gray, 'MODE') + ' ' + colorize(colorEnabled, info?.mode === 'public' ? ANSI.green : ANSI.yellow, mode, true) + '   ' + colorize(colorEnabled, ANSI.gray, 'PREFIX') + ' ' + prefix, width);
    panelLine('');
    panelLine(border(width, '  ╭', '╮'));
    panelLine(colorize(colorEnabled, ANSI.teal, '  │', true) + padVisible(title, width) + colorize(colorEnabled, ANSI.teal, '│', true));
    panelLine(colorize(colorEnabled, ANSI.teal, '  │', true) + padVisible(details, width) + colorize(colorEnabled, ANSI.teal, '│', true));
    panelLine(border(width, '  ╰', '╯'));
  };
  logger.startup = info => {
    const width = Math.max(38, Math.min(58, terminalWidth() - 8));
    const title = clip((info?.name || 'BASEBOT') + ' v' + (info?.version || '0.0.0'), width - 4);
    const rows = [
      ['MODE', info?.mode || 'public'], ['NODE', info?.node || process.version],
      ['PREFIX', info?.prefix || '.'], ['TIMEZONE', timezone]
    ];
    panelLine('');
    panelLine(border(width, '  ╭', '╮'));
    panelLine(colorize(colorEnabled, ANSI.teal, '  │', true) + ' ' + colorize(colorEnabled, ANSI.white, title, true) + ' '.repeat(Math.max(0, width - visibleWidth(title) - 1)) + colorize(colorEnabled, ANSI.teal, '│', true));
    panelLine(border(width, '  ├', '┤'));
    for (const [key, value] of rows) {
      const line = ' ' + colorize(colorEnabled, ANSI.gray, key.padEnd(10)) + ': ' + clip(value, width - 15);
      panelLine(colorize(colorEnabled, ANSI.teal, '  │', true) + fitVisible(line, width) + colorize(colorEnabled, ANSI.teal, '│', true));
    }
    panelLine(border(width, '  ╰', '╯'));
  };
  logger.plugins = summary => {
    if (!pretty) return record('info', 'Plugin registry siap.', summary);
    const loaded = Number(summary?.loaded || 0);
    const discovered = Number(summary?.discovered || 0);
    const commands = Number(summary?.commands || 0);
    const skipped = Number(summary?.skipped || 0);
    const status = skipped ? skipped + ' FAILED' : 'ALL READY';
    const color = skipped ? ANSI.yellow : ANSI.green;
    panelLine('  ' + colorize(colorEnabled, ANSI.teal, '◆', true) + ' ' + colorize(colorEnabled, ANSI.white, 'PLUGIN ECOSYSTEM', true) + ' ' + colorize(colorEnabled, color, loaded + '/' + discovered + ' plugins  ·  ' + commands + ' commands  ·  ' + status, true));
    const names = Array.isArray(summary?.plugins) ? summary.plugins.slice(0, 12).map(name => clip(name, 24)).join('  ·  ') : '';
    if (names) panelLine('    ' + colorize(colorEnabled, ANSI.gray, names));
  };
  logger.plugin = (name, category = 'general') => {
    if (LEVELS.info < threshold) return;
    if (!pretty) return record('info', 'Plugin terdaftar.', { plugin: name, category });
    panelLine('  ' + colorize(colorEnabled, ANSI.green, '●') + ' ' + colorize(colorEnabled, ANSI.white, clip(name, 28)) + ' ' + colorize(colorEnabled, ANSI.gray, '[' + clip(category, 20) + ']'));
  };
  logger.connection = (status, details = {}) => {
    const map = {
      open: ['CONNECTED', ANSI.green, '●'], connected: ['CONNECTED', ANSI.green, '●'],
      connecting: ['CONNECTING', ANSI.yellow, '◐'], close: ['DISCONNECTED', ANSI.red, '○'],
      disconnected: ['DISCONNECTED', ANSI.red, '○'], closing: ['CLOSING', ANSI.yellow, '◌']
    };
    const [label, color, icon] = map[String(status).toLowerCase()] || ['CONNECTION', ANSI.blue, '●'];
    if (!pretty) return record(status === 'close' ? 'warn' : 'info', 'WhatsApp ' + label.toLowerCase() + '.', { status, ...details });
    const safeDetails = redact(details);
    const panelWidth = Math.max(38, Math.min(58, terminalWidth() - 8));
    panelLine('');
    panelLine('  ' + colorize(colorEnabled, ANSI.teal, '╭─', true) + ' ' + colorize(colorEnabled, color, icon + ' ' + label, true) + ' ' + colorize(colorEnabled, ANSI.gray, '─'.repeat(Math.max(8, panelWidth - 12))));
    for (const [key, value] of Object.entries(safeDetails || {})) {
      if (value === undefined || value === false || value === '') continue;
      const line = '  ' + colorize(colorEnabled, ANSI.teal, '│') + ' ' + colorize(colorEnabled, ANSI.gray, padVisible(clip(key, 26) + ':', 28)) + ' ' + colorize(colorEnabled, ANSI.white, clip(typeof value === 'object' ? safeStringify(value) : value, 70));
      panelLine(line);
    }
    panelLine('  ' + colorize(colorEnabled, ANSI.teal, '╰' + '─'.repeat(panelWidth), true));
  };
  logger.activity = info => {
    const data = redact(info || {});
    if (!pretty) return record('info', 'Command selesai.', data);
    const command = clip(data.command || 'unknown', 30);
    const plugin = clip(data.plugin || 'plugin', 28);
    const category = data.category ? ' ' + colorize(colorEnabled, ANSI.gray, '[' + clip(data.category, 18) + ']') : '';
    const scope = clip(String(data.scope || 'chat').toUpperCase(), 12);
    const elapsed = Number.isFinite(data.durationMs) ? Math.max(0, data.durationMs) + 'ms' : '';
    panelLine('  ' + colorize(colorEnabled, ANSI.violet, '↳', true) + ' ' + colorize(colorEnabled, ANSI.white, '.' + command, true) + ' ' + colorize(colorEnabled, ANSI.gray, '→') + ' ' + colorize(colorEnabled, ANSI.teal, plugin) + category + ' ' + colorize(colorEnabled, ANSI.gray, '[' + scope + '] ' + elapsed));
  };
  logger.message = info => {
    const data = info || {};
    const group = data.chatType === 'group' || data.isGroup;
    const channel = data.chatType === 'newsletter' || data.isNewsletter;
    const title = clip(channel ? (data.groupName || 'Channel') : group ? (data.groupName || 'Group') : (data.pushName || 'Private chat'), 34);
    const type = TYPE_MAP[data.messageType || data.mtype] || ['MESSAGE', ANSI.gray];
    const role = data.isOwner ? ['OWNER', ANSI.red] : data.isPartner ? ['PARTNER', ANSI.orange] : data.isPremium ? ['PREMIUM', ANSI.yellow] : data.isAdmin ? ['ADMIN', ANSI.blue] : ['MEMBER', ANSI.gray];
    const width = Math.max(38, Math.min(58, terminalWidth() - 8));
    if (!pretty) return record('info', 'Pesan WhatsApp diterima.', { chatType: channel ? 'newsletter' : group ? 'group' : 'private', messageType: data.messageType || data.mtype || 'unknown', hasText: Boolean(data.hasText) });
    panelLine('');
    panelLine(border(width, '  ╭', '╮'));
    const head = ' ' + colorize(colorEnabled, channel ? ANSI.yellow : group ? ANSI.teal : ANSI.pink, channel ? 'CHANNEL' : group ? 'GROUP' : 'PRIVATE', true) + ' ' + colorize(colorEnabled, ANSI.white, title, true);
    panelLine(colorize(colorEnabled, ANSI.teal, '  │', true) + fitVisible(head, width) + colorize(colorEnabled, ANSI.teal, '│', true));
    panelLine(border(width, '  ├', '┤'));
    const rows = [
      ' ' + colorize(colorEnabled, ANSI.gray, 'TYPE'.padEnd(9)) + ' ' + colorize(colorEnabled, type[1], type[0]),
      ' ' + colorize(colorEnabled, ANSI.gray, 'ROLE'.padEnd(9)) + ' ' + colorize(colorEnabled, role[1], role[0], true),
      ' ' + colorize(colorEnabled, ANSI.gray, 'DEVICE'.padEnd(9)) + ' ' + clip(data.device || 'Unknown', 22),
      ' ' + colorize(colorEnabled, ANSI.gray, 'CONTENT'.padEnd(9)) + ' ' + (data.hasText ? 'Text available (content hidden)' : 'Media / event')
    ];
    for (const row of rows) panelLine(colorize(colorEnabled, ANSI.teal, '  │', true) + fitVisible(row, width) + colorize(colorEnabled, ANSI.teal, '│', true));
    panelLine(border(width, '  ╰', '╯'));
  };
  logger.errorBox = (title, message) => {
    if (LEVELS.error < threshold) return;
    const width = Math.max(38, Math.min(58, terminalWidth() - 8));
    panelLine('');
    panelLine(border(width, '  ╭', '╮'));
    const heading = ' ' + colorize(colorEnabled, ANSI.red, 'ERROR', true) + ' ' + colorize(colorEnabled, ANSI.white, clip(title, width - 10), true);
    panelLine(colorize(colorEnabled, ANSI.teal, '  │', true) + fitVisible(heading, width) + colorize(colorEnabled, ANSI.teal, '│', true));
    panelLine(border(width, '  ├', '┤'));
    panelLine(colorize(colorEnabled, ANSI.teal, '  │', true) + fitVisible(' ' + clip(message, width - 3), width) + colorize(colorEnabled, ANSI.teal, '│', true));
    panelLine(border(width, '  ╰', '╯'));
  };
  logger.getTimestamp = () => shortTime(clock(), timezone);
  logger.createBanner = lines => {
    const values = Array.isArray(lines) ? lines.map(line => clip(line, 100)) : [];
    const width = Math.min(terminalWidth() - 8, Math.max(24, ...values.map(visibleWidth)));
    panelLine(border(width + 2, '  ╭', '╮'));
    for (const value of values) panelLine(colorize(colorEnabled, ANSI.teal, '  │') + ' ' + padVisible(fitVisible(value, width), width) + ' ' + colorize(colorEnabled, ANSI.teal, '│'));
    panelLine(border(width + 2, '  ╰', '╯'));
  };

  return Object.freeze(logger);
}

function createBanner(lines) {
  const values = Array.isArray(lines) ? lines.map(line => clip(line, 100)) : [];
  const width = Math.min(terminalWidth() - 8, Math.max(24, ...values.map(visibleWidth)));
  return ['╭' + '─'.repeat(width + 2) + '╮', ...values.map(line => '│ ' + padVisible(fitVisible(line, width), width) + ' │'), '╰' + '─'.repeat(width + 2) + '╯'].join('\n');
}
function getTimestamp(timezone = 'Asia/Jakarta', date = new Date()) { return shortTime(date, timezone); }
function divider(sink = console) {
  const writer = typeof sink.log === 'function' ? sink.log : () => {};
  writer.call(sink, colorize(Boolean(sink === console && process.stdout.isTTY && !process.env.NO_COLOR), ANSI.border, '  ' + '─'.repeat(Math.max(32, Math.min(terminalWidth() - 4, 76)))));
}
const theme = Object.freeze({
  primary: ANSI.violet, secondary: ANSI.teal, accent: ANSI.yellow, text: ANSI.white, dim: ANSI.gray,
  success: ANSI.green, error: ANSI.red, warning: ANSI.yellow, info: ANSI.blue, debug: ANSI.gray,
  border: ANSI.border, tag: ANSI.violet, pink: ANSI.pink, orange: ANSI.orange, lime: ANSI.lime
});
const c = Object.freeze(Object.fromEntries(Object.entries({
  green: ANSI.green, purple: ANSI.violet, white: ANSI.white, gray: ANSI.gray, red: ANSI.red,
  yellow: ANSI.yellow, cyan: ANSI.teal, blue: ANSI.blue, magenta: ANSI.pink, orange: ANSI.orange, lime: ANSI.lime
}).map(([name, code]) => [name, value => colorize(Boolean(process.stdout.isTTY && !process.env.NO_COLOR), code, value)])));

module.exports = { createLogger, redact, sanitizeText, stripAnsi, visibleWidth, terminalWidth, fitVisible, clip, createBanner, getTimestamp, divider, theme, c };
