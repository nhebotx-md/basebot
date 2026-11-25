'use strict';

const { RotatingFileLog } = require('./rotating-file-log.service');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: Infinity };
const SECRET_KEY = /(?:token|secret|password|passwd|api.?key|pairing.?code|authorization|cookie)|^(?:me|jid|remotejid|chatid|participant|participantjid|phone|phonenumber|pushname|sender|chat)$/i;
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
    // Pesan agregat provider (mis. kegagalan TikTok: TikWM | Soclip | legacy)
    // disimpan di properti custom error; tanpa ini diagnosis di log hilang.
    if (Array.isArray(value.providerErrors)) {
      safe.providerErrors = value.providerErrors
        .filter(item => typeof item === 'string')
        .map(item => sanitizeText(item).slice(0, 240))
        .slice(0, 20);
    }
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
function terminalWidth(input = process.stdout.columns) {
  const columns = Number(input);
  if (!Number.isFinite(columns) || columns <= 0) return 80;
  return Math.min(100, Math.max(1, columns));
}
function getPanelWidth(maximum = 72, padding = 4, columns = process.stdout.columns) {
  return Math.max(1, Math.min(maximum, terminalWidth(columns) - padding));
}
function autoColorEnabled(isTerminal = process.stdout.isTTY, env = process.env) {
  const noColor = env.NO_COLOR !== undefined && String(env.NO_COLOR) !== '';
  return Boolean(isTerminal && !noColor && String(env.TERM || '').toLowerCase() !== 'dumb');
}
function terminalEnvironment(env = process.env, platform = process.platform, arch = process.arch) {
  const termux = Boolean(env.TERMUX_VERSION || /(?:^|\/)com\.termux\/files\/usr\/?$/i.test(String(env.PREFIX || '')));
  const terminalName = termux ? 'Termux' : (env.TERM_PROGRAM || env.TERM || 'Terminal');
  const color = !autoColorEnabled(true, env) ? 'MONOCHROME' : termux ? '24-BIT COLOR' : 'ANSI COLOR';
  return {
    termux,
    platform: termux ? 'Android / Termux' : platform + ' / ' + arch,
    terminal: sanitizeText(terminalName).slice(0, 30),
    color
  };
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
function wrapText(value, width) {
  const words = sanitizeText(value).replace(/[\r\n]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (line && visibleWidth(candidate) > width) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
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

function createLogger({ level = 'info', sink = console, component = 'MUSE-MD', format = 'json', colors, clock = () => new Date(), timezone = 'Asia/Jakarta', file = null } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const pretty = format === 'pretty';
  const colorEnabled = colors === undefined ? autoColorEnabled(sink === console) : Boolean(colors);
  const fileTransport = file ? new RotatingFileLog(file) : null;
  const pluginDiscovery = new Map();
  const logger = {};

  function writeLine(line, method = 'log') {
    const writer = typeof sink[method] === 'function' ? sink[method] : sink.log;
    if (typeof writer === 'function') writer.call(sink, line);
  }
  function persistRecord(name, message, meta) {
    const entry = { timestamp: clock().toISOString(), level: name.toUpperCase(), component: sanitizeText(component), pid: process.pid, message: sanitizeText(message) };
    if (meta !== undefined) entry.data = redact(meta);
    fileTransport?.write(entry);
    return entry;
  }
  function humanizeKey(key) {
    return String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toUpperCase();
  }
  function formatMetaValue(value) {
    if (value === null) return 'null';
    if (typeof value === 'object') return clip(safeStringify(value), 72);
    return clip(String(value), 72);
  }
  function record(name, message, meta, forcePretty = false) {
    const entry = persistRecord(name, message, meta);
    if (!pretty && !forcePretty) {
      writeLine(JSON.stringify(entry), name === 'success' || name === 'system' ? 'info' : name);
      return;
    }
    const [label, color] = LEVEL_STYLE[name] || LEVEL_STYLE.info;
    const time = colorize(colorEnabled, ANSI.gray, shortTime(new Date(entry.timestamp), timezone));
    const levelLabel = colorize(colorEnabled, color, padVisible(label, 7), true);
    const compact = terminalWidth() < 68;
    const source = compact ? '' : '  ' + colorize(colorEnabled, ANSI.violet, clip(entry.component.toUpperCase(), 10).padEnd(10), true);
    const prefix = '  ' + time + '  ' + levelLabel + source + '  ' + colorize(colorEnabled, ANSI.violet, '›') + '  ';
    const messageWidth = Math.max(8, terminalWidth() - visibleWidth(prefix) - 2);
    const messageText = colorize(colorEnabled, ANSI.white, fitVisible(clip(entry.message, messageWidth), messageWidth));
    writeLine(prefix + messageText, name === 'success' || name === 'system' ? 'info' : name);
    if (entry.data && typeof entry.data === 'object' && !Array.isArray(entry.data)) {
      const entries = Object.entries(entry.data);
      const maxLines = 4;
      const maxPerLine = terminalWidth() >= 112 ? 4 : terminalWidth() >= 96 ? 2 : 1;
      const shown = entries.slice(0, maxLines * maxPerLine);
      const indentWidth = Math.min(36, Math.max(2, terminalWidth() - 30));
      const metadataWidth = Math.max(8, terminalWidth() - indentWidth - 2);
      for (let index = 0; index < shown.length; index += maxPerLine) {
        const fields = shown.slice(index, index + maxPerLine).map(([key, value]) =>
          colorize(colorEnabled, ANSI.gray, humanizeKey(key)) + colorize(colorEnabled, ANSI.gray, '=') +
          colorize(colorEnabled, ANSI.white, formatMetaValue(value))
        );
        writeLine(' '.repeat(indentWidth) + fitVisible(colorize(colorEnabled, ANSI.border, '·') + ' ' + fields.join(colorize(colorEnabled, ANSI.border, '  │  ')), metadataWidth));
      }
      if (entries.length > shown.length) {
        const summary = colorize(colorEnabled, ANSI.gray, '· +' + (entries.length - shown.length) + ' metadata fields');
        writeLine(' '.repeat(indentWidth) + fitVisible(summary, metadataWidth));
      }
    } else if (entry.data !== undefined) {
      const indentWidth = Math.min(36, Math.max(2, terminalWidth() - 30));
      writeLine(' '.repeat(indentWidth) + fitVisible(colorize(colorEnabled, ANSI.border, '·') + ' ' + colorize(colorEnabled, ANSI.gray, formatMetaValue(entry.data)), Math.max(8, terminalWidth() - indentWidth - 2)));
    }
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
  // Error plugin dengan ID referensi yang tersimpan sebagai log JSON.
  // Setiap kegagalan plugin dicatat satu baris JSONL dengan
  // data.kind === 'plugin-error' dan data.reference === REF, sehingga REF
  // yang dikirim ke grup bisa dicari di file log (`grep <REF> logs/*.jsonl`
  // atau perintah owner `.logref <REF>`). Pesan error lengkap juga
  // ditampilkan di terminal; sebelumnya metadata error terpotong menjadi
  // "+N metadata fields" dan tidak terlihat.
  logger.errorReference = (details = {}) => {
    if (LEVELS.error < threshold) return null;
    const reference = String(details.reference || '').trim().toUpperCase();
    if (!/^[0-9A-F]{8}$/.test(reference)) return null;
    const errorData = details.error instanceof Error || (details.error && typeof details.error === 'object')
      ? redact(details.error)
      : { name: 'Error', message: sanitizeText(details.error ?? 'Unknown error') };
    const data = {
      kind: 'plugin-error',
      reference,
      plugin: clip(details.plugin || 'unknown', 64),
      command: clip(details.command || '-', 40),
      stage: clip(details.stage || 'execute', 24),
      ...(details.scope ? { scope: clip(details.scope, 16) } : {}),
      error: errorData
    };
    if (!pretty) { record('error', 'Plugin gagal saat dieksekusi.', data); return reference; }
    persistRecord('error', 'Plugin gagal saat dieksekusi.', data);
    const time = colorize(colorEnabled, ANSI.gray, shortTime(clock(), timezone));
    const levelLabel = colorize(colorEnabled, ANSI.red, padVisible('ERROR', 7), true);
    const prefix = '  ' + time + '  ' + levelLabel + '  ' + colorize(colorEnabled, ANSI.violet, '›') + '  ';
    writeLine(prefix + colorize(colorEnabled, ANSI.white, 'Plugin gagal saat dieksekusi. [REF ' + reference + ']'), 'error');
    const indentWidth = Math.min(36, Math.max(2, terminalWidth() - 30));
    const detailWidth = Math.max(8, terminalWidth() - indentWidth - 2);
    const rows = [
      ['PLUGIN', data.plugin],
      ['COMMAND', data.command],
      ['ERROR', String(errorData.name || 'Error')]
    ];
    for (const [key, value] of rows) {
      writeLine(' '.repeat(indentWidth) + colorize(colorEnabled, ANSI.border, '·') + ' ' + colorize(colorEnabled, ANSI.gray, key + '=') + colorize(colorEnabled, ANSI.white, clip(String(value), detailWidth)), 'error');
    }
    for (const line of wrapText(String(errorData.message || ''), detailWidth)) {
      writeLine(' '.repeat(indentWidth) + colorize(colorEnabled, ANSI.border, '·') + ' ' + colorize(colorEnabled, ANSI.gray, 'DETAIL=') + colorize(colorEnabled, ANSI.white, line), 'error');
    }
    return reference;
  };
  logger.divider = () => panelLine(colorize(colorEnabled, ANSI.border, '  ' + '─'.repeat(Math.max(12, Math.min(terminalWidth() - 4, 76)))));
  logger.banner = info => {
    if (threshold > LEVELS.info) return;
    const name = clip(info?.name || 'MUSE-MD', 32).toUpperCase();
    const version = clip(info?.version || '', 20);
    const mode = clip(String(info?.mode || 'public').toUpperCase(), 16);
    const node = clip(info?.node || process.version, 20);
    const prefix = clip(info?.prefix || '.', 8);
    const width = getPanelWidth(64, 6);
    const title = fitVisible('  ' + name + '  ' + colorize(colorEnabled, ANSI.violet, 'v' + version) + '  ' + colorize(colorEnabled, ANSI.gray, '·') + '  ' + colorize(colorEnabled, ANSI.white, 'PLUGIN WHATSAPP FRAMEWORK', true), width);
    const details = fitVisible('  ' + colorize(colorEnabled, ANSI.gray, 'NODE') + ' ' + node + '   ' + colorize(colorEnabled, ANSI.gray, 'MODE') + ' ' + colorize(colorEnabled, info?.mode === 'public' ? ANSI.green : ANSI.yellow, mode, true) + '   ' + colorize(colorEnabled, ANSI.gray, 'PREFIX') + ' ' + prefix, width);
    panelLine('');
    panelLine(border(width, '  ╭', '╮'));
    panelLine(colorize(colorEnabled, ANSI.teal, '  │', true) + padVisible(title, width) + colorize(colorEnabled, ANSI.teal, '│', true));
    panelLine(colorize(colorEnabled, ANSI.teal, '  │', true) + padVisible(details, width) + colorize(colorEnabled, ANSI.teal, '│', true));
    panelLine(border(width, '  ╰', '╯'));
  };
  logger.startup = info => {
    if (threshold > LEVELS.info) return;
    const terminal = terminalEnvironment();
    const details = {
      name: info?.name || 'MUSE-MD', version: info?.version || '0.0.0',
      node: info?.node || process.version, mode: info?.mode || 'public',
      prefix: info?.prefix || '.', timezone: info?.timezone || timezone,
      logLevel: info?.logLevel || level, fileLogEnabled: Boolean(fileTransport)
    };
    persistRecord('system', 'Runtime startup.', details);
    const width = getPanelWidth(72, 6);
    const edge = colorize(colorEnabled, ANSI.teal, '  │', true);
    const right = colorize(colorEnabled, ANSI.teal, '│', true);
    const row = (label, value, valueColor = ANSI.white) => {
      const left = '  ' + colorize(colorEnabled, ANSI.gray, label.padEnd(10)) + ' ';
      const available = Math.max(8, width - visibleWidth(left));
      panelLine(edge + left + padVisible(colorize(colorEnabled, valueColor, fitVisible(clip(value, 100), available)), available) + right);
    };
    const section = title => panelLine(edge + padVisible(fitVisible('  ' + colorize(colorEnabled, ANSI.gray, title.toUpperCase(), true), width), width) + right);
    const heading = '  ' + colorize(colorEnabled, ANSI.white, clip(details.name, 28).toUpperCase(), true) +
      '  ' + colorize(colorEnabled, ANSI.violet, 'v' + clip(details.version, 16), true) +
      '  ' + colorize(colorEnabled, ANSI.gray, '◆');
    const subtitle = '  ' + colorize(colorEnabled, ANSI.gray, 'WHATSAPP AUTOMATION  /  PLUGIN FRAMEWORK');
    panelLine('');
    panelLine(border(width, '  ╭', '╮'));
    panelLine(edge + padVisible(fitVisible(heading, width), width) + right);
    panelLine(edge + padVisible(fitVisible(subtitle, width), width) + right);
    panelLine(border(width, '  ├', '┤'));
    section('Runtime environment');
    row('ENGINE', 'Node.js ' + details.node, ANSI.teal);
    row('PLATFORM', terminal.platform, ANSI.teal);
    row('TERMINAL', terminal.terminal + (terminal.termux ? ' · Android shell' : ''), ANSI.teal);
    const colorMode = colorEnabled ? (terminal.color === 'MONOCHROME' ? 'ANSI FORCED' : terminal.color) : 'MONOCHROME';
    row('DISPLAY', terminalWidth() + ' columns · ' + colorMode, ANSI.teal);
    row('MODE', String(details.mode).toUpperCase(), details.mode === 'public' ? ANSI.green : ANSI.yellow);
    row('PREFIX', details.prefix);
    row('TIMEZONE', details.timezone);
    panelLine(border(width, '  ├', '┤'));
    section('Observability');
    row('LOG LEVEL', String(details.logLevel).toUpperCase(), ANSI.teal);
    row('FILE LOG', details.fileLogEnabled ? 'JSONL  /  ROTATION ENABLED' : 'DISABLED', details.fileLogEnabled ? ANSI.green : ANSI.yellow);
    row('PROCESS', 'PID ' + process.pid + '  /  ' + (process.env.TERM_PROGRAM || process.env.TERM || 'TERM'));
    panelLine(border(width, '  ╰', '╯'));
    panelLine(fitVisible('  ' + colorize(colorEnabled, ANSI.teal, '◆', true) + ' ' +
      colorize(colorEnabled, ANSI.white, 'BOOT SEQUENCE', true) + ' ' +
      colorize(colorEnabled, ANSI.gray, '· INITIALIZING CORE SERVICES'), Math.max(20, terminalWidth() - 2)));
  };
  logger.plugins = summary => {
    if (threshold > LEVELS.info) return;
    if (!pretty) return record('info', 'Plugin registry siap.', summary);
    persistRecord('info', 'Plugin registry siap.', summary);
    const loaded = Number(summary?.loaded || 0);
    const discovered = Number(summary?.discovered || 0);
    const commands = Number(summary?.commands || 0);
    const skipped = Number(summary?.skipped || 0);
    const width = getPanelWidth(72, 6);
    const edge = colorize(colorEnabled, ANSI.teal, '  │', true);
    const right = colorize(colorEnabled, ANSI.teal, '│', true);
    const row = (label, value, valueColor = ANSI.white) => {
      const left = '  ' + colorize(colorEnabled, ANSI.gray, label.padEnd(10)) + ' ';
      const available = Math.max(0, width - visibleWidth(left));
      panelLine(edge + left + padVisible(colorize(colorEnabled, valueColor, fitVisible(value, available)), available) + right);
    };
    panelLine('');
    panelLine(border(width, '  ╭', '╮'));
    panelLine(edge + padVisible(fitVisible('  ' + colorize(colorEnabled, ANSI.white, 'PLUGIN ECOSYSTEM', true) + '  ' + colorize(colorEnabled, ANSI.gray, 'REGISTRY OVERVIEW'), width), width) + right);
    panelLine(border(width, '  ├', '┤'));
    row('PLUGINS', loaded + ' / ' + discovered + ' loaded', skipped ? ANSI.yellow : ANSI.green);
    row('COMMANDS', String(commands) + ' registered', ANSI.teal);
    row('HEALTH', skipped ? skipped + ' MODULE(S) NEED ATTENTION' : 'ALL READY · ALL SYSTEMS OPERATIONAL', skipped ? ANSI.yellow : ANSI.green);
    const names = Array.isArray(summary?.plugins) ? summary.plugins.map(name => clip(name, 24)) : [];
    if (names.length) {
      panelLine(border(width, '  ├', '┤'));
      panelLine(edge + padVisible(fitVisible('  ' + colorize(colorEnabled, ANSI.gray, 'MODULE SNAPSHOT', true), width), width) + right);
      const previewLimit = 10;
      const headCount = names.length > previewLimit ? 8 : previewLimit;
      const visibleNames = names.length > previewLimit
        ? [...names.slice(0, headCount), ...names.slice(-2)]
        : names;
      let line = '';
      for (const name of visibleNames) {
        const candidate = line ? line + '   ·   ' + name : name;
        if (visibleWidth(candidate) > width - 4 && line) {
          panelLine(edge + padVisible(fitVisible('  ' + line, width), width) + right);
          line = name;
        } else line = candidate;
      }
      if (line) panelLine(edge + padVisible(fitVisible('  ' + line, width), width) + right);
      if (names.length > visibleNames.length) {
        const omitted = names.length - visibleNames.length;
        panelLine(edge + padVisible(fitVisible('  ' + colorize(colorEnabled, ANSI.yellow, '+' + omitted + ' additional modules hidden to keep the dashboard compact'), width), width) + right);
      }
    }
    const categoryCounts = new Map();
    for (const item of pluginDiscovery.values()) {
      const category = clip(item.category || 'general', 16);
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    }
    if (categoryCounts.size > 0) {
      const categorySummary = [...categoryCounts.entries()].map(([name, count]) => name + ':' + count).join('  ·  ');
      panelLine(edge + padVisible(fitVisible('  ' + colorize(colorEnabled, ANSI.gray, 'CATEGORIES', true) + '  ' + categorySummary, width), width) + right);
    }
    panelLine(border(width, '  ╰', '╯'));
    if (skipped) record('warn', 'Sebagian plugin tidak aktif.', { skipped, discovered, loaded });
    else panelLine(fitVisible('  ' + colorize(colorEnabled, ANSI.green, '✓', true) + ' ' + colorize(colorEnabled, ANSI.gray, 'Plugin registry initialized successfully.'), Math.max(1, terminalWidth() - 2)));
  };
  logger.stage = (label, detail = '', status = 'success') => {
    if (threshold > LEVELS.info) return;
    const styles = { success: [ANSI.green, '✓', 'SUCCESS'], running: [ANSI.yellow, '◌', 'RUNNING'], warn: [ANSI.yellow, '!', 'WARNING'], error: [ANSI.red, '×', 'FAILED'], info: [ANSI.teal, '›', 'INFO'] };
    const [color, icon, state] = styles[String(status).toLowerCase()] || styles.info;
    const levelName = status === 'error' ? 'error' : status === 'warn' ? 'warn' : 'system';
    const message = clip(label, 48) + (detail ? ' · ' + clip(detail, 110) : '');
    if (!pretty) return record(levelName, message, { stage: clip(label, 48), status: state });
    persistRecord(levelName, message, { stage: clip(label, 48), status: state });
    panelLine(fitVisible('  ' + colorize(colorEnabled, color, icon, true) + ' ' +
      colorize(colorEnabled, ANSI.white, clip(label, 30), true) +
      (detail ? '  ' + colorize(colorEnabled, ANSI.gray, clip(detail, 90)) : '') +
      '  ' + colorize(colorEnabled, color, state, true), Math.max(1, terminalWidth() - 2)));
  };
  logger.shutdown = (details = {}) => {
    if (threshold > LEVELS.info) return;
    const message = 'MUSE-MD shutdown completed.';
    const metadata = { signal: details.signal || 'MANUAL', status: details.status || 'CLEAN EXIT', durationMs: details.durationMs };
    if (!pretty) return record('system', message, metadata);
    persistRecord('system', message, metadata);
    const width = getPanelWidth(72, 6);
    const edge = colorize(colorEnabled, ANSI.teal, '  │', true);
    const right = colorize(colorEnabled, ANSI.teal, '│', true);
    panelLine('');
    panelLine(border(width, '  ╭', '╮'));
    panelLine(edge + padVisible(fitVisible('  ' + colorize(colorEnabled, ANSI.white, 'MUSE-MD SHUTDOWN', true) + '  ' + colorize(colorEnabled, ANSI.gray, 'CONTROLLED EXIT'), width), width) + right);
    panelLine(border(width, '  ├', '┤'));
    const rows = [
      ['SIGNAL', metadata.signal],
      ['STATUS', metadata.status],
      ['DURATION', Number.isFinite(details.durationMs) ? details.durationMs + ' ms' : '—']
    ];
    for (const [label, value] of rows) {
      const left = '  ' + colorize(colorEnabled, ANSI.gray, label.padEnd(10)) + ' ';
      const available = Math.max(0, width - visibleWidth(left));
      panelLine(edge + left + padVisible(colorize(colorEnabled, ANSI.green, fitVisible(String(value), available)), available) + right);
    }
    panelLine(border(width, '  ╰', '╯'));
  };
  logger.plugin = (name, category = 'general') => {
    const safeName = clip(name, 48);
    const safeCategory = clip(category || 'general', 24);
    if (!safeName) return;
    pluginDiscovery.set(safeName, { name: safeName, category: safeCategory });
    // Keep per-plugin discovery out of the live terminal stream. The consolidated
    // registry panel reports totals and a bounded preview after loading completes.
    if (fileTransport) persistRecord('info', 'Plugin discovered.', { plugin: safeName, category: safeCategory });
  };
  logger.connection = (status, details = {}) => {
    const map = {
      open: ['CONNECTED', ANSI.green, '●'], connected: ['CONNECTED', ANSI.green, '●'],
      connecting: ['CONNECTING', ANSI.yellow, '◐'], close: ['DISCONNECTED', ANSI.red, '○'],
      disconnected: ['DISCONNECTED', ANSI.red, '○'], closing: ['CLOSING', ANSI.yellow, '◌']
    };
    const score = String(status).toLowerCase() === 'close' || String(status).toLowerCase() === 'disconnected' ? LEVELS.warn : LEVELS.info;
    if (score < threshold) return;
    const [label, color, icon] = map[String(status).toLowerCase()] || ['CONNECTION', ANSI.blue, '●'];
    if (!pretty) return record(status === 'close' ? 'warn' : 'info', 'WhatsApp ' + label.toLowerCase() + '.', { status, ...details });
    persistRecord(status === 'close' || status === 'disconnected' ? 'warn' : 'info', 'WhatsApp ' + label.toLowerCase() + '.', { status, ...details });
    const safeDetails = redact(details);
    const panelWidth = getPanelWidth(58, 8);
    panelLine('');
    panelLine('  ' + colorize(colorEnabled, ANSI.teal, '╭─', true) + ' ' + colorize(colorEnabled, color, icon + ' ' + label, true) + ' ' + colorize(colorEnabled, ANSI.gray, '─'.repeat(Math.max(8, panelWidth - 12))));
    for (const [key, value] of Object.entries(safeDetails || {})) {
      if (value === undefined || value === false || value === '') continue;
      const labelWidth = terminalWidth() < 56 ? 12 : 28;
      const valueWidth = Math.max(0, panelWidth - labelWidth - 5);
      const line = '  ' + colorize(colorEnabled, ANSI.teal, '│') + ' ' + colorize(colorEnabled, ANSI.gray, padVisible(clip(key, labelWidth - 1) + ':', labelWidth)) + ' ' + colorize(colorEnabled, ANSI.white, clip(typeof value === 'object' ? safeStringify(value) : value, valueWidth));
      panelLine(line);
    }
    panelLine('  ' + colorize(colorEnabled, ANSI.teal, '╰' + '─'.repeat(panelWidth), true));
  };
  logger.activity = info => {
    if (threshold > LEVELS.info) return;
    const data = redact(info || {});
    if (!pretty) return record('info', 'Command selesai.', data);
    persistRecord('info', 'Command selesai.', data);
    const command = clip(data.command || 'unknown', 30);
    const plugin = clip(data.plugin || 'plugin', 28);
    const category = data.category ? ' ' + colorize(colorEnabled, ANSI.gray, '[' + clip(data.category, 18) + ']') : '';
    const scope = clip(String(data.scope || 'chat').toUpperCase(), 12);
    const elapsed = Number.isFinite(data.durationMs) ? Math.max(0, data.durationMs) + 'ms' : '';
    const reference = data.reference ? ' #' + clip(data.reference, 12) : '';
    const timestamp = colorize(colorEnabled, ANSI.gray, shortTime(clock(), timezone));
    panelLine(fitVisible('  ' + timestamp + ' ' + colorize(colorEnabled, ANSI.violet, '↳', true) + ' ' + colorize(colorEnabled, ANSI.white, '.' + command, true) + ' ' + colorize(colorEnabled, ANSI.gray, '→') + ' ' + colorize(colorEnabled, ANSI.teal, plugin) + category + ' ' + colorize(colorEnabled, ANSI.gray, '[' + scope + '] ' + elapsed + reference), Math.max(1, terminalWidth() - 2)));
  };
  logger.message = info => {
    if (LEVELS.info < threshold) return;
    const data = info || {};
    const group = data.chatType === 'group' || data.isGroup;
    const channel = data.chatType === 'newsletter' || data.isNewsletter;
    const title = channel ? 'Channel update' : group ? 'Group message' : 'Private message';
    const type = TYPE_MAP[data.messageType || data.mtype] || ['MESSAGE', ANSI.gray];
    const role = data.isOwner ? ['OWNER', ANSI.red] : data.isPartner ? ['PARTNER', ANSI.orange] : data.isPremium ? ['PREMIUM', ANSI.yellow] : data.isAdmin ? ['ADMIN', ANSI.blue] : ['MEMBER', ANSI.gray];
    const width = getPanelWidth(58, 8);
    const messageMeta = { chatType: channel ? 'newsletter' : group ? 'group' : 'private', messageType: data.messageType || data.mtype || 'unknown', hasText: Boolean(data.hasText), role: role[0] };
    if (!pretty) return record('info', 'Pesan WhatsApp diterima.', messageMeta);
    persistRecord('info', 'Pesan WhatsApp diterima.', messageMeta);
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
    persistRecord('error', title, { detail: message });
    const width = getPanelWidth(58, 8);
    panelLine('');
    panelLine(border(width, '  ╭', '╮'));
    const heading = ' ' + colorize(colorEnabled, ANSI.red, 'ERROR', true) + ' ' + colorize(colorEnabled, ANSI.white, clip(title, width - 10), true);
    panelLine(colorize(colorEnabled, ANSI.teal, '  │', true) + fitVisible(heading, width) + colorize(colorEnabled, ANSI.teal, '│', true));
    panelLine(border(width, '  ├', '┤'));
    panelLine(colorize(colorEnabled, ANSI.teal, '  │', true) + fitVisible(' ' + clip(message, width - 3), width) + colorize(colorEnabled, ANSI.teal, '│', true));
    panelLine(border(width, '  ╰', '╯'));
  };
  logger.getTimestamp = () => shortTime(clock(), timezone);
  logger.fileStatus = () => fileTransport?.status() || { enabled: false, closed: true };
  logger.flush = async () => fileTransport?.flush();
  logger.close = async () => fileTransport?.close();
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
  writer.call(sink, colorize(autoColorEnabled(sink === console), ANSI.border, '  ' + '─'.repeat(Math.max(12, Math.min(terminalWidth() - 4, 76)))));
}
const theme = Object.freeze({
  primary: ANSI.violet, secondary: ANSI.teal, accent: ANSI.yellow, text: ANSI.white, dim: ANSI.gray,
  success: ANSI.green, error: ANSI.red, warning: ANSI.yellow, info: ANSI.blue, debug: ANSI.gray,
  border: ANSI.border, tag: ANSI.violet, pink: ANSI.pink, orange: ANSI.orange, lime: ANSI.lime
});
const c = Object.freeze(Object.fromEntries(Object.entries({
  green: ANSI.green, purple: ANSI.violet, white: ANSI.white, gray: ANSI.gray, red: ANSI.red,
  yellow: ANSI.yellow, cyan: ANSI.teal, blue: ANSI.blue, magenta: ANSI.pink, orange: ANSI.orange, lime: ANSI.lime
}).map(([name, code]) => [name, value => colorize(autoColorEnabled(), code, value)])));

module.exports = { createLogger, redact, sanitizeText, stripAnsi, visibleWidth, terminalWidth, getPanelWidth, terminalEnvironment, autoColorEnabled, fitVisible, clip, createBanner, getTimestamp, divider, theme, c };
