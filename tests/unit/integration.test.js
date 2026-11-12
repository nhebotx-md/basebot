'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../../src/config/config-loader');
const { PluginRegistry } = require('../../src/core/plugins/plugin-registry');
const { CommandDispatcher } = require('../../src/core/messaging/command-dispatcher');
const { createMessagesUpsertHandler } = require('../../src/core/events/messages-upsert');

const logger = { info() {}, debug() {}, warn() {}, error() {} };
test('mock messages.upsert builds context, dispatches case-insensitive command, and replies through shared service', async () => {
  const config = loadConfig({ OWNER_NUMBERS: '6281234567890', BOT_PREFIX: '.', TEMP_DIR: '/tmp/basebot-integration-temp' });
  const registry = new PluginRegistry();
  registry.register({ name: 'ping', commands: ['ping', 'p'], category: 'system', description: 'test', usage: '.ping', permissions: {}, async execute(ctx) { await ctx.reply(`Pong: ${ctx.text}`); } });
  const dispatcher = new CommandDispatcher({ registry, logger, rateLimit: 0 });
  const sent = [];
  const client = { user: { id: '6281234567890:1@s.whatsapp.net' }, public: true, decodeJid: value => value?.replace(/:\d+@/, '@'), async sendMessage(...args) { sent.push(args); } };
  const handler = createMessagesUpsertHandler({ dispatcher, config, registry, logger });
  const makeMessage = (id, message) => ({ key: { id, remoteJid: '6289999999999@s.whatsapp.net', fromMe: false }, message });
  await handler(client, { type: 'notify', messages: [makeMessage('cmd1', { conversation: '.PING hello there' }), makeMessage('ordinary', { conversation: 'not a command' }), makeMessage('empty', {})] }, { contacts: {} });
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], '6289999999999@s.whatsapp.net');
  assert.equal(sent[0][1].text, 'Pong: hello there');
  assert.equal(sent[0][2].quoted.key.id, 'cmd1');
});
