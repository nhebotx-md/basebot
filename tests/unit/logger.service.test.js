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


test('startup dashboard shows runtime diagnostics in one structured panel', () => {
  const lines = [];
  const sink = { log(line) { lines.push(String(line)); }, info(line) { lines.push(String(line)); }, warn(line) { lines.push(String(line)); }, error(line) { lines.push(String(line)); } };
  const { createLogger } = require('../../src/core/services/logger.service');
  const logger = createLogger({ level: 'info', format: 'pretty', colors: false, sink, clock: () => new Date('2026-11-15T11:00:00.000Z'), timezone: 'Asia/Jakarta' });

  logger.startup({ name: 'BASEBOT', version: '2.0.0', node: 'v22.23.4', mode: 'public', prefix: '.', timezone: 'Asia/Jakarta' });

  const output = lines.join('\\n');
  assert.match(output, /BASEBOT\\s+\\/\\s+WHATSAPP AUTOMATION/);
  assert.match(output, /VERSION\\s+: v2\\.0\\.0/);
  assert.match(output, /RUNTIME\\s+: v22\\.23\\.4/);
  assert.match(output, /MODE\\s+: PUBLIC/);
  assert.match(output, /PREFIX\\s+: \\./);
  assert.match(output, /TIMEZONE\\s+: Asia\\/Jakarta/);
  assert.match(output, /PROCESS\\s+: \\d+\\s+·\\s+\\d+ MB RSS/);
  assert.match(output, /BOOT TIME\\s+: 15\\/11, 18\\.00\\.00/);
});
