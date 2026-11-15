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
    safeLabel: 'BASEBOT'
  };

  assert.deepEqual(redact(input), {
    accessToken: '[REDACTED]',
    apiKey: '[REDACTED]',
    pairingCode: '[REDACTED]',
    password: '[REDACTED]',
    safeLabel: 'BASEBOT'
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
  logger.startup({ name: 'BASEBOT', version: '2.0.0', mode: 'public', node: 'v22.23.4', prefix: '.', timezone: 'Asia/Jakarta', logLevel: 'info' });
  const output = lines.join('\\n');
  assert.match(output, /BASEBOT/);
  assert.match(output, /Node\\.js v22\\.23\\.4/);
  assert.match(output, /PLATFORM/);
  assert.match(output, /Asia\\/Jakarta/);
  assert.match(output, /INITIALIZING/);
  assert.equal(lines.filter(line => line.includes('╭')).length, 2);
});

test('plugin dashboard lists every active module across wrapped lines', () => {
  const { createLogger } = require('../../src/core/services/logger.service');
  const lines = [];
  const sink = { log(line) { lines.push(String(line)); }, info(line) { lines.push(String(line)); }, warn(line) { lines.push(String(line)); }, error(line) { lines.push(String(line)); } };
  const logger = createLogger({ format: 'pretty', colors: false, sink });
  const plugins = Array.from({ length: 18 }, (_, index) => 'plugin-' + String(index + 1).padStart(2, '0'));
  logger.plugins({ loaded: 18, discovered: 18, skipped: 0, commands: 42, plugins });
  const output = lines.join('\\n');
  assert.match(output, /plugin-01/);
  assert.match(output, /plugin-18/);
  assert.match(output, /42 registered/);
  assert.match(output, /ALL READY/);
});
