'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createLogger, stripAnsi, visibleWidth, fitVisible, terminalWidth, getPanelWidth, terminalEnvironment, autoColorEnabled } = require('../../src/core/services/logger.service');

function createSink() {
  const lines = [];
  const sink = {};
  for (const method of ['log', 'info', 'warn', 'error', 'debug']) sink[method] = line => lines.push(String(line));
  return { sink, lines };
}

test('terminal dashboard renders compact runtime and plugin panels', () => {
  const { sink, lines } = createSink();
  const logger = createLogger({ sink, format: 'pretty', colors: false, level: 'info' });
  logger.startup({ name: 'BASEBOT', version: '2.0.0', node: 'v22.23.4', mode: 'public', prefix: '.', timezone: 'Asia/Jakarta', logLevel: 'info' });
  logger.plugins({ loaded: 50, discovered: 50, commands: 141, skipped: 0, plugins: ['doctor', 'health', 'sticker', 'downloader'] });
  const output = lines.join('\n');
  assert.match(output, /BASEBOT/);
  assert.match(output, /RUNTIME ENVIRONMENT/);
  assert.match(output, /PLUGIN ECOSYSTEM/);
  assert.match(output, /50 \/ 50 loaded/);
  assert.match(output, /141 registered/);
  assert.match(output, /ALL SYSTEMS OPERATIONAL/);
});

test('pretty logs show readable metadata without leaking credentials', () => {
  const { sink, lines } = createSink();
  const logger = createLogger({ sink, format: 'pretty', colors: false, level: 'info' });
  logger.info('Provider initialized.', { providerName: 'Primary', timeoutMs: 30000, apiKey: 'secret-value' });
  const output = lines.join('\n');
  assert.match(output, /INFO/);
  assert.match(output, /Provider initialized/);
  assert.match(output, /PROVIDER NAME=Primary/);
  assert.match(output, /TIMEOUT MS=30000/);
  assert.doesNotMatch(output, /secret-value/);
  assert.match(output, /REDACTED/);
});

test('boot stages and shutdown summary are rendered and persisted as log events', async () => {
  const { sink, lines } = createSink();
  const logger = createLogger({ sink, format: 'pretty', colors: false, level: 'info' });
  logger.stage('DATABASE', 'Persistent storage ready', 'success');
  logger.stage('PLUGINS', 'One plugin needs attention', 'warn');
  logger.shutdown({ signal: 'SIGINT', status: 'CLEAN EXIT', durationMs: 125 });
  const output = lines.join('\n');
  assert.match(output, /DATABASE/);
  assert.match(output, /SUCCESS/);
  assert.match(output, /PLUGINS/);
  assert.match(output, /WARNING/);
  assert.match(output, /BASEBOT SHUTDOWN/);
  assert.match(output, /SIGINT/);
  assert.match(output, /125 ms/);
  await logger.close();
});

test('terminal width helpers handle ANSI colors and clipping', () => {
  const colored = '\u001b[31mBASEBOT\u001b[0m';
  assert.equal(stripAnsi(colored), 'BASEBOT');
  assert.equal(visibleWidth(colored), 7);
  assert.equal(visibleWidth(fitVisible('BASEBOT FRAMEWORK', 9)), 9);
});

test('terminal profile detects Termux and respects monochrome terminal settings', () => {
  const profile = terminalEnvironment({ PREFIX: '/data/data/com.termux/files/usr', TERMUX_VERSION: '0.118', TERM: 'xterm-256color' }, 'linux', 'arm64');
  assert.equal(profile.termux, true);
  assert.equal(profile.platform, 'Android / Termux');
  assert.equal(profile.terminal, 'Termux');
  assert.equal(profile.color, '24-BIT COLOR');
  assert.equal(autoColorEnabled(true, { TERM: 'dumb' }), false);
  assert.equal(autoColorEnabled(true, { TERM: 'xterm-256color', NO_COLOR: '' }), true);
  assert.equal(autoColorEnabled(true, { TERM: 'xterm-256color', NO_COLOR: '1' }), false);
  assert.equal(autoColorEnabled(true, { TERM: 'xterm-256color' }), true);
});

test('dashboard and runtime logs stay within narrow Termux terminal columns', () => {
  assert.equal(terminalWidth(40), 40);
  assert.equal(terminalWidth(16), 16);
  assert.equal(getPanelWidth(72, 6, 40), 34);
  assert.equal(getPanelWidth(72, 6, 16), 10);
  const originalColumns = Object.getOwnPropertyDescriptor(process.stdout, 'columns');
  const originalTermux = process.env.TERMUX_VERSION;
  const originalPrefix = process.env.PREFIX;
  Object.defineProperty(process.stdout, 'columns', { configurable: true, writable: true, value: 40 });
  process.env.TERMUX_VERSION = '0.118';
  process.env.PREFIX = '/data/data/com.termux/files/usr';
  try {
    const { sink, lines } = createSink();
    const logger = createLogger({ sink, format: 'pretty', colors: false, level: 'info' });
    logger.startup({ name: 'BASEBOT', version: '2.0.0', node: 'v22.23.4', mode: 'public', prefix: '.', timezone: 'Asia/Jakarta', logLevel: 'info' });
    logger.plugins({ loaded: 3, discovered: 3, commands: 10, skipped: 0, plugins: ['sticker', 'downloader', 'system-doctor'] });
    logger.info('Runtime event fits the terminal.', { connectionStatus: 'connected', retryCount: 0 });
    logger.stage('CONNECTION MANAGER INITIALIZATION', 'WhatsApp transport is preparing with detailed startup information', 'running');
    logger.connection('open', { connection: 'open', reconnectAttempt: 0, statusCode: 200 });
    logger.message({ chatType: 'group', groupName: 'private group name hidden', messageType: 'conversation', hasText: true });
    logger.activity({ command: 'verylongcommandname', plugin: 'a-plugin-with-a-long-name', category: 'media', scope: 'group', durationMs: 345, reference: 'trace-123456789' });
    logger.errorBox('A detailed runtime error title', 'A long but sanitized description of a runtime failure.');
    logger.shutdown({ signal: 'SIGINT', status: 'CLEAN EXIT', durationMs: 120 });
    const output = lines.map(stripAnsi);
    assert.match(output.join('\n'), /Android \/ Termux/);
    assert.match(output.join('\n'), /40 columns/);
    assert.doesNotMatch(output.join('\n'), /private group name hidden/);
    for (const line of output) assert.ok(visibleWidth(line) <= 40, `line exceeds terminal width: ${line}`);

    Object.defineProperty(process.stdout, 'columns', { configurable: true, writable: true, value: 28 });
    const compact = createSink();
    const compactLogger = createLogger({ sink: compact.sink, format: 'pretty', colors: false, level: 'info' });
    compactLogger.startup({ name: 'BASEBOT', version: '2.0.0', node: 'v22.23.4', mode: 'public', prefix: '.', timezone: 'Asia/Jakarta', logLevel: 'info' });
    compactLogger.plugins({ loaded: 3, discovered: 3, commands: 10, skipped: 0, plugins: ['sticker', 'downloader'] });
    compactLogger.stage('CONNECTION MANAGER INITIALIZATION', 'Long detail that must be clipped cleanly', 'running');
    compactLogger.connection('open', { connection: 'open', reconnectAttempt: 0, statusCode: 200 });
    compactLogger.message({ chatType: 'group', messageType: 'conversation', hasText: true });
    compactLogger.activity({ command: 'verylongcommandname', plugin: 'a-plugin-with-a-long-name', scope: 'group', durationMs: 345, reference: 'trace-123456789' });
    compactLogger.errorBox('Detailed runtime error title', 'Long description of an error.');
    compactLogger.shutdown({ signal: 'SIGINT', status: 'CLEAN EXIT', durationMs: 120 });
    for (const line of compact.lines.map(stripAnsi)) assert.ok(visibleWidth(line) <= 28, `line exceeds compact terminal width: ${line}`);
  } finally {
    if (originalColumns) Object.defineProperty(process.stdout, 'columns', originalColumns);
    else delete process.stdout.columns;
    if (originalTermux === undefined) delete process.env.TERMUX_VERSION;
    else process.env.TERMUX_VERSION = originalTermux;
    if (originalPrefix === undefined) delete process.env.PREFIX;
    else process.env.PREFIX = originalPrefix;
  }
});
