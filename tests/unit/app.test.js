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
  assert.equal(app.registry.list().length, 175);
  assert.equal(app.config.paths.database, '/tmp/basebot-test-database');
  assert.equal(app.users.expPerMessage, 5);
  assert.equal(app.users.expCooldownMs, 60000);
  assert.equal(app.registry.list().reduce((count, plugin) => count + plugin.commands.length, 0), 173);
  assert.ok(app.registry.list().every(plugin => plugin.commands.length === 1), 'every plugin must own exactly one command');
  assert.ok(app.registry.list().every(plugin => plugin.category === plugin.filePath.split('/')[0]), 'plugin category must match its directory');
  assert.ok(app.registry.list().some(plugin => plugin.name === 'account-profile'));
  assert.ok(app.registry.list().some(plugin => plugin.name === 'health'));
  assert.ok(app.registry.list().some(plugin => plugin.name === 'doctor'));
  assert.ok(app.registry.list().some(plugin => plugin.name === 'database-backup'));
  assert.ok(app.registry.getByCommand('backup'));
  assert.equal(typeof app.backupService.create, 'function');
  assert.ok(app.registry.get('finance-income'));
  assert.ok(app.registry.get('finance-finance'));
  assert.equal(typeof app.financeService.summary, 'function');
  assert.ok(app.registry.getByCommand('tt'));
  assert.ok(app.registry.getByCommand('ytmp3'));
  assert.ok(app.registry.getByCommand('fb'));
  assert.ok(app.registry.getByCommand('musik'));
  assert.ok(app.registry.getByCommand('yta'));
  assert.ok(app.registry.list().some(plugin => plugin.name === 'media-bass'));
  assert.ok(app.registry.list().some(plugin => plugin.name === 'sticker-brat'));
  assert.equal(app.registry.get('sticker-brat').category, 'sticker');
  assert.equal(app.registry.get('media-bass').category, 'media');
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
  for (const name of ['group-groupinfo', 'group-grupset', 'group-anggota', 'group-joinrequests', 'group-joinrequest', 'message-poll', 'message-react', 'interactive-menu', 'message-spoiler', 'group-admin-manager', 'community-manager', 'newsletter-manager', 'rich-message']) {
    assert.ok(app.registry.list().some(plugin => plugin.name === name), `missing plugin: ${name}`);
  }
  assert.equal(typeof app.start, 'function');
  assert.equal(typeof app.stop, 'function');
  const summary = messages.find(([message]) => message === 'Plugin registry siap.');
  assert.ok(summary);
  assert.equal(summary[1].discovered, 175);
  assert.equal(summary[1].loaded, 175);
  assert.equal(summary[1].skipped, 0);
  assert.equal(summary[1].commands, 175);
  await app.stop();
});

test('Baileys fork exports required APIs through dynamic import', async () => {
  const baileys = await import('@itsliaaa/baileys');
  for (const name of ['makeWASocket', 'useMultiFileAuthState', 'DisconnectReason', 'jidDecode', 'downloadContentFromMessage']) assert.ok(baileys[name], `missing export: ${name}`);
});
