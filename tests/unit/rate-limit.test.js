'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CommandDispatcher } = require('../../src/core/messaging/command-dispatcher');
const { PluginRegistry } = require('../../src/core/plugins/plugin-registry');

test('dispatcher limits command bursts per sender without executing rejected work', async () => {
  const registry = new PluginRegistry(); let executions = 0;
  registry.register({ name: 'work', commands: ['work'], category: 'test', description: 'test', usage: '.work', permissions: {}, async execute() { executions += 1; } });
  const logger = { info() {}, warn() {}, error() {}, debug() {} };
  const dispatcher = new CommandDispatcher({ registry, logger, rateLimit: 1, rateWindowMs: 60_000 });
  const replies = [];
  const context = id => ({ m: { id }, command: 'work', sender: '6281111111111@s.whatsapp.net', isOwner: false, isGroup: false, isPrivate: true, publicMode: true, config: { publicMode: true }, async reply(text) { replies.push(text); } });
  assert.equal((await dispatcher.dispatch(context('m1'))).handled, true);
  assert.equal((await dispatcher.dispatch(context('m2'))).reason, 'rate-limit');
  assert.equal(executions, 1);
  assert.match(replies[0], /Terlalu banyak command/);
});

test('dispatcher rejects excess concurrent work and releases its slot after completion', async () => {
  const registry = new PluginRegistry();
  let executions = 0;
  let finish;
  registry.register({ name: 'long-work', commands: ['long'], category: 'test', description: 'test', usage: '.long', permissions: {}, execute() { executions += 1; return new Promise(resolve => { finish = resolve; }); } });
  const dispatcher = new CommandDispatcher({ registry, logger: { info() {}, warn() {}, error() {}, debug() {} }, rateLimit: 0, maxConcurrentCommands: 1 });
  const context = id => ({ m: { id }, command: 'long', sender: id, isOwner: true, isGroup: false, isPrivate: true, publicMode: true, config: { publicMode: true }, async reply() {} });
  const first = dispatcher.dispatch(context('first'));
  const second = await dispatcher.dispatch(context('second'));
  assert.equal(second.reason, 'busy');
  assert.equal(executions, 1);
  finish();
  await first;
  assert.equal(dispatcher.activeCommands, 0);
});


test('unauthorized commands are rate-limited before denial replies and warning spam is muted', async () => {
  const registry = new PluginRegistry();
  registry.register({ name: 'owner-tool', commands: ['owner'], category: 'owner', description: 'test', usage: '.owner', permissions: { ownerOnly: true }, async execute() { throw new Error('unauthorized'); } });
  const replies = [];
  const dispatcher = new CommandDispatcher({ registry, logger: { info() {}, warn() {}, error() {}, debug() {} }, rateLimit: 1 });
  const context = id => ({ m: { id }, command: 'owner', sender: 'user@s.whatsapp.net', isOwner: false, isGroup: false, isPrivate: true, publicMode: true, config: { publicMode: true }, async reply(text) { replies.push(text); } });
  assert.equal((await dispatcher.dispatch(context('d1'))).reason, 'owner');
  assert.equal((await dispatcher.dispatch(context('d2'))).reason, 'rate-limit');
  assert.equal((await dispatcher.dispatch(context('d3'))).reason, 'rate-limit');
  assert.equal(replies.length, 2);
});
