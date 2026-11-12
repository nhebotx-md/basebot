'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadConfig, readDotEnv } = require('../../src/config/config-loader');
const { createLogger, redact } = require('../../src/core/services/logger.service');
const { assertPublicHttpUrl } = require('../../src/core/security/safe-url');

test('configuration reads owner/prefix, accepts legacy custom pairing config as deprecated, and validates logging/timezone', () => {
  const config = loadConfig({ OWNER_NUMBERS: '6281234567890, 6281111111111', BOT_PREFIX: '!', PAIRING_PHONE: '6281234567890', PAIRING_CODE: 'SHONNHEE', BAILEYS_LOG_LEVEL: 'debug', TIMEZONE: 'Asia/Jakarta' });
  assert.deepEqual(config.owners, ['6281234567890', '6281111111111']);
  assert.equal(config.prefix, '!');
  assert.equal(config.welcomeEnabled, true);
  assert.equal(config.pairing.code, 'SHONNHEE');
  assert.equal(config.logging.baileysLevel, 'debug');
  assert.throws(() => loadConfig({ OWNER_NUMBERS: '6281234567890', BAILEYS_LOG_LEVEL: 'verbose' }), /BAILEYS_LOG_LEVEL/);
  assert.throws(() => loadConfig({ OWNER_NUMBERS: '6281234567890', TIMEZONE: 'Not/AZone' }), /TIMEZONE/);
});

test('dotenv reader preserves existing process values and quoted # characters', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'basebot-env-'));
  const file = path.join(root, '.env');
  try {
    fs.writeFileSync(file, 'KEEP=new\nVALUE="secret # still part of value" # trailing comment\nPLAIN=value # comment\n');
    const target = { KEEP: 'existing' };
    readDotEnv(file, target);
    assert.equal(target.KEEP, 'existing');
    assert.equal(target.VALUE, 'secret # still part of value');
    assert.equal(target.PLAIN, 'value');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('logger redaction handles secret fields, query parameters, errors, and media buffers', () => {
  const sanitized = redact({ apiKey: 'hidden', url: 'https://example.org/?token=hidden', media: Buffer.from('private') });
  assert.equal(sanitized.apiKey, '[REDACTED]');
  assert.doesNotMatch(sanitized.url, /hidden/);
  assert.equal(sanitized.media, '[Buffer 7 bytes]');
  const message = redact('Authorization: Bearer bearersecret https://example.org/?key=querysecret&token=tokensecret');
  assert.doesNotMatch(message, /bearersecret|querysecret|tokensecret/);
  const credentials = redact('Authorization: Basic basicsecret, Cookie: session=cookiesecret');
  assert.doesNotMatch(credentials, /basicsecret|cookiesecret/);
  const error = redact(new Error('request failed with token=querysecret'));
  assert.doesNotMatch(JSON.stringify(error), /querysecret/);
  assert.match(error.stack, /Error:/);
});

test('logger emits timestamped structured records and redacts metadata', () => {
  const lines = [];
  const sink = { info(line) { lines.push(line); } };
  createLogger({ level: 'info', sink, component: 'test' }).info('Socket aktif.', { token: 'do-not-print', statusCode: 515 });
  const record = JSON.parse(lines[0]);
  assert.match(record.timestamp, /^\d{4}-\d\d-\d\dT/);
  assert.equal(record.level, 'INFO');
  assert.equal(record.component, 'test');
  assert.equal(record.message, 'Socket aktif.');
  assert.equal(record.data.token, '[REDACTED]');
  assert.equal(record.data.statusCode, 515);
});

test('public URL validator rejects loopback addresses before opening a request', async () => {
  await assert.rejects(() => assertPublicHttpUrl('http://127.0.0.1/private'), /private|publik/i);
});
