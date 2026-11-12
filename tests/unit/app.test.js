'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../../src/config/config-loader');
const { createApp } = require('../../src/app');

test('app loads all bundled plugins without opening a WhatsApp socket', async () => {
  const config = loadConfig({ OWNER_NUMBERS: '6281234567890', PLUGINS_DIR: './plugins', SESSION_DIR: '/tmp/basebot-test-session', TEMP_DIR: '/tmp/basebot-test-temp', LOG_DIR: '/tmp/basebot-test-logs' });
  const messages = [];
  const logger = { info(...args) { messages.push(args); }, debug() {}, warn() {}, error(...args) { messages.push(args); } };
  const app = await createApp({ config, logger });
  assert.equal(app.registry.list().length, 25);
  assert.equal(app.registry.list().reduce((count, plugin) => count + plugin.commands.length, 0), 54);
  assert.ok(app.registry.list().some(plugin => plugin.name === 'voicechanger'));
  assert.ok(app.registry.list().some(plugin => plugin.name === 'sticker-rest-api'));
  assert.equal(typeof app.start, 'function');
  assert.equal(typeof app.stop, 'function');
  const summary = messages.find(([message]) => message === 'Plugin registry siap.');
  assert.ok(summary);
  assert.equal(summary[1].discovered, 25);
  assert.equal(summary[1].loaded, 25);
  assert.equal(summary[1].skipped, 0);
  assert.equal(summary[1].commands, 54);
});

test('Baileys fork exports required APIs through dynamic import', async () => {
  const baileys = await import('@itsliaaa/baileys');
  for (const name of ['makeWASocket', 'useMultiFileAuthState', 'DisconnectReason', 'jidDecode', 'downloadContentFromMessage']) assert.ok(baileys[name], `missing export: ${name}`);
});
