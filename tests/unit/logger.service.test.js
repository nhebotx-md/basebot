'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { redact, sanitizeText } = require('../../src/core/services/logger.service');

test('redact masks credential-like property names', () => {
  const input = {
    accessToken: 'token-value',
    apiKey: 'api-key-value',
    pairingCode: '12345678',
    password: 'password-value',
    safeLabel: 'MUSE-MD'
  };

  assert.deepEqual(redact(input), {
    accessToken: '[REDACTED]',
    apiKey: '[REDACTED]',
    pairingCode: '[REDACTED]',
    password: '[REDACTED]',
    safeLabel: 'MUSE-MD'
  });
});

test('redact masks WhatsApp identity and contact metadata', () => {
  const input = {
    pushName: 'Private Name',
    remoteJid: '6281234567890@s.whatsapp.net',
    phoneNumber: '6281234567890',
    chatType: 'private',
    messageType: 'conversation'
  };

  assert.deepEqual(redact(input), {
    pushName: '[REDACTED]',
    remoteJid: '[REDACTED]',
    phoneNumber: '[REDACTED]',
    chatType: 'private',
    messageType: 'conversation'
  });
});

test('sanitizeText masks authorization credentials and bearer tokens', () => {
  const output = sanitizeText('Authorization: Bearer abc123; status=connected');

  assert.match(output, /Authorization: \[REDACTED\]/i);
  assert.doesNotMatch(output, /abc123/);
  assert.match(output, /status=connected/);
});

test('startup dashboard renders one consolidated runtime panel', () => {
  const { createLogger } = require('../../src/core/services/logger.service');
  const lines = [];
  const sink = { log(line) { lines.push(String(line)); }, info(line) { lines.push(String(line)); }, warn(line) { lines.push(String(line)); }, error(line) { lines.push(String(line)); } };
  const logger = createLogger({ format: 'pretty', colors: false, sink });
  logger.startup({ name: 'MUSE-MD', version: '2.0.0', mode: 'public', node: 'v22.23.4', prefix: '.', timezone: 'Asia/Jakarta', logLevel: 'info' });
  const output = lines.join(' ');
  assert.ok(output.includes('MUSE-MD'));
  assert.ok(output.includes('Node.js v22.23.4'));
  assert.ok(output.includes('PLATFORM'));
  assert.ok(output.includes('Asia/Jakarta'));
  assert.ok(output.includes('INITIALIZING'));
  assert.equal(lines.filter(line => line.includes('╭')).length, 1);
});

test('plugin dashboard bounds its module preview as the ecosystem grows', () => {
  const { createLogger } = require('../../src/core/services/logger.service');
  const lines = [];
  const sink = { log(line) { lines.push(String(line)); }, info(line) { lines.push(String(line)); }, warn(line) { lines.push(String(line)); }, error(line) { lines.push(String(line)); } };
  const logger = createLogger({ format: 'pretty', colors: false, sink });
  const plugins = Array.from({ length: 120 }, (_, index) => 'plugin-' + String(index + 1).padStart(3, '0'));
  for (const plugin of plugins) logger.plugin(plugin, plugin.includes('001') ? 'owner' : 'general');
  assert.equal(lines.length, 0, 'individual discovery events must not flood the terminal');
  logger.plugins({ loaded: 120, discovered: 120, skipped: 0, commands: 342, plugins });
  const output = lines.join(' ');
  assert.ok(output.includes('plugin-001'));
  assert.ok(output.includes('plugin-120'));
  assert.ok(output.includes('+110 additional modules hidden'));
  assert.ok(output.includes('342 registered'));
  assert.ok(output.includes('ALL READY'));
  assert.ok(output.includes('CATEGORIES'));
});
