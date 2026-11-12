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
