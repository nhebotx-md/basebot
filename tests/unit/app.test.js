'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../../src/config/config-loader');
const { createApp } = require('../../src/app');

test('app loads all bundled plugins without opening a WhatsApp socket', async () => {
  const config = loadConfig({}, { owners: ['6281234567890'], plugins: { directory: './plugins', autoReload: false }, paths: { session: '/tmp/basebot-test-session', temp: '/tmp/basebot-test-temp', logs: '/tmp/basebot-test-logs', database: '/tmp/basebot-test-database' } });
  const messages = [];
  const logger = { info(...args) { messages.push(args); }, debug() {}, warn() {}, error(...args) { messages.push(args); } };
  const app = await createApp({ config, logger });
  assert.equal(app.registry.list().length, 50);
  assert.equal(app.config.paths.database, '/tmp/basebot-test-database');
  assert.equal(app.users.expPerMessage, 5);
  assert.equal(app.users.expCooldownMs, 60000);
  assert.equal(app.registry.list().reduce((count, plugin) => count + plugin.commands.length, 0), 141);
  assert.ok(app.registry.list().some(plugin => plugin.name === 'profile'));
  assert.ok(app.registry.list().some(plugin => plugin.name === 'health'));
  assert.ok(app.registry.list().some(plugin => plugin.name === 'doctor'));
  assert.ok(app.registry.getByCommand('tt'));
  assert.ok(app.registry.getByCommand('ytmp3'));
  assert.ok(app.registry.getByCommand('fb'));
  assert.ok(app.registry.getByCommand('musik'));
  assert.ok(app.registry.getByCommand('yta'));
  assert.ok(app.registry.list().some(plugin => plugin.name === 'voicechanger'));
  assert.ok(app.registry.list().some(plugin => plugin.name === 'sticker-rest-api'));
  assert.equal(app.registry.get('sticker-rest-api').category, 'sticker');
  assert.equal(app.registry.get('voicechanger').category, 'maker');
  assert.ok(app.registry.getByCommand('tochibi'));
  assert.ok(app.registry.getByCommand('totag'));
  assert.ok(app.registry.getByCommand('antilink'));
  assert.ok(app.registry.getByCommand('antiswgc'));
  assert.ok(app.registry.getByCommand('antitagsw'));
  assert.ok(app.registry.getByCommand('bratfoto'));
  assert.ok(app.registry.getByCommand('welcome'));
  assert.ok(app.registry.getByCommand('setbio'));
  assert.ok(app.registry.getByCommand('setname'));
  assert.ok(app.registry.getByCommand('setthumb'));
  for (const name of ['group-info', 'group-settings', 'group-members', 'group-requests', 'group-request-action', 'poll', 'message-actions', 'interactive-menu', 'message-wrappers', 'group-admin-manager', 'community-manager', 'newsletter-manager', 'rich-message']) {
    assert.ok(app.registry.list().some(plugin => plugin.name === name), `missing plugin: ${name}`);
  }
  assert.equal(typeof app.start, 'function');
  assert.equal(typeof app.stop, 'function');
  const summary = messages.find(([message]) => message === 'Plugin registry siap.');
  assert.ok(summary);
  assert.equal(summary[1].discovered, 50);
  assert.equal(summary[1].loaded, 50);
  assert.equal(summary[1].skipped, 0);
  assert.equal(summary[1].commands, 141);
  await app.stop();
});

test('Baileys fork exports required APIs through dynamic import', async () => {
  const baileys = await import('@itsliaaa/baileys');
  for (const name of ['makeWASocket', 'useMultiFileAuthState', 'DisconnectReason', 'jidDecode', 'downloadContentFromMessage']) assert.ok(baileys[name], `missing export: ${name}`);
});
