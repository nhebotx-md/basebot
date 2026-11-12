'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCommand } = require('../../src/core/messaging/command-parser');
const { normalizeMessage, getMessageText } = require('../../src/core/messaging/normalize-message');
const { normalizeIdentity, validatePermission } = require('../../src/core/security/permission-manager');
const { PluginRegistry } = require('../../src/core/plugins/plugin-registry');
const { validatePlugin } = require('../../src/core/plugins/plugin-validator');
const { CommandDispatcher } = require('../../src/core/messaging/command-dispatcher');
const { isPrivateAddress } = require('../../src/core/security/safe-url');

function plugin(overrides = {}) {
  return { name: 'ping', commands: ['ping', 'p'], category: 'system', description: 'Ping', usage: '.ping', permissions: {}, execute: async () => {}, ...overrides };
}

test('parser uses configured prefix and tokenizes command/arguments consistently', () => {
  assert.deepEqual(parseCommand('!PING hello   world', ['.', '!']), { prefix: '!', command: 'ping', args: ['hello', 'world'], text: 'hello world', body: '!PING hello   world' });
  assert.equal(parseCommand('hello world', '.'), null);
  assert.equal(parseCommand('.', '.'), null);
});

test('normalizer unwraps ephemeral content and extracts standard message text', () => {
  assert.equal(getMessageText({ ephemeralMessage: { message: { conversation: 'hello' } } }), 'hello');
  assert.equal(getMessageText({ imageMessage: { caption: '.menu' } }), '.menu');
  const m = normalizeMessage({ key: { remoteJid: '123@s.whatsapp.net', id: 'x' }, message: { conversation: 'hi' } }, {});
  assert.equal(m.body, 'hi');
  assert.equal(m.isPrivate, true);
});

test('identities normalize device suffix and permissions deny unavailable admin metadata', () => {
  assert.equal(normalizeIdentity('628123:4@s.whatsapp.net'), '628123@s.whatsapp.net');
  assert.deepEqual(validatePermission(plugin({ permissions: { ownerOnly: true } }), { isOwner: false, isGroup: false, isPrivate: true }), { allowed: false, reason: 'owner' });
  assert.equal(validatePermission(plugin({ permissions: { adminOnly: true } }), { isOwner: false, isGroup: true, isPrivate: false, isGroupAdmin: false }).allowed, false);
  assert.equal(validatePermission(plugin({ permissions: { restricted: true } }), { isOwner: false, isGroup: false, isPrivate: true, publicMode: true }).allowed, false);
});

test('registry rejects duplicate plugin names and aliases, and supports disable/enable', () => {
  const registry = new PluginRegistry();
  registry.register(plugin());
  assert.equal(registry.getByCommand('P').name, 'ping');
  assert.throws(() => registry.register(plugin({ name: 'duplicate' })), /bertabrakan/);
  assert.throws(() => registry.register(plugin()), /duplikat/);
  registry.disable('ping');
  assert.equal(registry.getByCommand('ping'), undefined);
  registry.enable('ping');
  assert.ok(registry.getByCommand('ping'));
  assert.equal(validatePlugin(plugin()).valid, true);
});

test('dispatcher executes a message once and isolates plugin errors', async () => {
  const registry = new PluginRegistry();
  let count = 0;
  registry.register(plugin({ execute: async () => { count += 1; throw new Error('expected test failure'); } }));
  const errors = [];
  const logger = { info() {}, warn() {}, error(...args) { errors.push(args); }, debug() {} };
  const dispatcher = new CommandDispatcher({ registry, logger });
  const replies = [];
  const ctx = { m: { id: 'one' }, command: 'ping', isOwner: true, isGroup: false, isPrivate: true, publicMode: true, config: { publicMode: true }, reply: async text => replies.push(text) };
  await dispatcher.dispatch(ctx);
  const duplicate = await dispatcher.dispatch(ctx);
  assert.equal(count, 1);
  assert.equal(duplicate.reason, 'duplicate');
  assert.equal(errors.length, 1);
  assert.match(replies[0], /kesalahan/);
});

test('URL safety utility blocks private and reserved address ranges', () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '192.0.2.1', '169.254.10.2', '::1', '::ffff:7f00:1', 'ff02::1', '2001:db8::1', 'fc00::1']) assert.equal(isPrivateAddress(address), true, address);
  assert.equal(isPrivateAddress('8.8.8.8'), false);
});

test('permissions enforce group/private and self mode while retaining owner access', () => {
  assert.equal(validatePermission(plugin({ permissions: { groupOnly: true } }), { isGroup: false, isPrivate: true, isOwner: true }).reason, 'group');
  assert.equal(validatePermission(plugin({ permissions: { privateOnly: true } }), { isGroup: true, isPrivate: false, isOwner: false }).reason, 'private');
  assert.equal(validatePermission(plugin(), { isGroup: false, isPrivate: true, isOwner: false, publicMode: false }).reason, 'restricted');
  assert.equal(validatePermission(plugin(), { isGroup: false, isPrivate: true, isOwner: true, publicMode: false }).allowed, true);
});

test('limited response reader rejects a body that exceeds its byte cap', async () => {
  const { Readable } = require('node:stream');
  const { readResponseLimited } = require('../../src/core/security/safe-url');
  const response = { headers: { get() { return null; } }, body: Readable.from([Buffer.from('oversized')]) };
  await assert.rejects(() => readResponseLimited(response, 3), /batas ukuran/);
});
