'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createLogger, stripAnsi, visibleWidth, fitVisible } = require('../../src/core/services/logger.service');

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
