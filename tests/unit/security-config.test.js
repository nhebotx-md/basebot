'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadConfig, readDotEnv } = require('../../src/config/config-loader');
const { redact } = require('../../src/core/services/logger.service');
const { assertPublicHttpUrl } = require('../../src/core/security/safe-url');

test('configuration reads owner/prefix from env, validates pairing, and accepts IANA timezone', () => {
  const config = loadConfig({ OWNER_NUMBERS: '6281234567890, 6281111111111', BOT_PREFIX: '!', PAIRING_PHONE: '6281234567890', PAIRING_CODE: 'ABCD1234', TIMEZONE: 'Asia/Jakarta' });
  assert.deepEqual(config.owners, ['6281234567890', '6281111111111']);
  assert.equal(config.prefix, '!');
  assert.equal(config.welcomeEnabled, true);
  assert.throws(() => loadConfig({ OWNER_NUMBERS: '6281234567890', PAIRING_CODE: 'bad' }), /PAIRING_CODE/);
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

test('logger redaction handles secret field names, query parameters, errors, and media buffers', () => {
  const sanitized = redact({ apiKey: 'hidden', url: 'https://example.org/?token=hidden', media: Buffer.from('private') });
  assert.equal(sanitized.apiKey, '[REDACTED]');
  assert.doesNotMatch(sanitized.url, /hidden/);
  assert.equal(sanitized.media, '[Buffer 7 bytes]');
  const message = redact('Authorization: Bearer bearersecret https://example.org/?key=querysecret&token=tokensecret');
  assert.doesNotMatch(message, /bearersecret|querysecret|tokensecret/);
  const credentials = redact('Authorization: Basic basicsecret, Cookie: session=cookiesecret');
  assert.doesNotMatch(credentials, /basicsecret|cookiesecret/);
});

test('public URL validator rejects loopback addresses before opening a request', async () => {
  await assert.rejects(() => assertPublicHttpUrl('http://127.0.0.1/private'), /private|publik/i);
});
