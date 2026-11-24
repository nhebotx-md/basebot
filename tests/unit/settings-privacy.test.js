'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadConfig, resolveSettingsPath, getSettingsSource } = require('../../src/config/config-loader');

test('configuration resolver prefers ignored local settings and safely falls back to template', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-md-settings-'));
  fs.writeFileSync(path.join(root, 'settings.example.js'), 'module.exports = {};');
  assert.equal(path.basename(resolveSettingsPath(root)), 'settings.example.js');
  assert.equal(getSettingsSource(root), 'template');
  fs.writeFileSync(path.join(root, 'settings.js'), 'module.exports = {};');
  assert.equal(path.basename(resolveSettingsPath(root)), 'settings.js');
  assert.equal(getSettingsSource(root), 'local');
  fs.rmSync(root, { recursive: true, force: true });
});

test('max queued setting is bounded and provider secrets remain environment-only', () => {
  const config = loadConfig({ SOCLIP_API_KEY: 'private-key', TTS_API_KEY: 'tts-key' }, {
    owners: ['6281234567890'], commandLimits: { maxQueued: 40 }
  });
  assert.equal(config.commandLimits.maxQueued, 40);
  assert.equal(config.downloaders.soclipApiKey, 'private-key');
  assert.equal(config.tts.apiKey, 'tts-key');
});
