'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCommand } = require('../../src/core/messaging/command-parser');
const { normalizeMessage, getMessageText } = require('../../src/core/messaging/normalize-message');
const { normalizeIdentity, validatePermission } = require('../../src/core/security/permission-manager');
const { PluginRegistry } = require('../../src/core/plugins/plugin-registry');
const { validatePlugin } = require('../../src/core/plugins/plugin-validator');
const { CommandDispatcher, formatPluginFailure, diagnosePluginError } = require('../../src/core/messaging/command-dispatcher');
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

test('normalizer prefers PN alternate JIDs over LID for private and group senders', () => {
  const privateMessage = normalizeMessage({
    key: { remoteJid: '987654321@lid', remoteJidAlt: '6281234567890@s.whatsapp.net', id: 'private-lid' },
    message: { conversation: '.get' }
  }, {});
  assert.equal(privateMessage.sender, '6281234567890@s.whatsapp.net');
  assert.deepEqual(privateMessage.senderCandidates, ['6281234567890@s.whatsapp.net', '987654321@lid']);

  const groupMessage = normalizeMessage({
    key: {
      remoteJid: '120363000000000000@g.us',
      participant: '987654321@lid',
      participantAlt: '6281234567890@s.whatsapp.net',
      id: 'group-lid'
    },
    message: { conversation: '.get' }
  }, {});
  assert.equal(groupMessage.sender, '6281234567890@s.whatsapp.net');
  assert.deepEqual(groupMessage.senderCandidates, ['6281234567890@s.whatsapp.net', '987654321@lid']);

  const senderPnMessage = normalizeMessage({
    key: { remoteJid: '120363000000000000@g.us', participant: '987654321@lid', senderPn: '6281234567890@s.whatsapp.net', id: 'sender-pn' },
    message: { conversation: '.get' }
  }, {});
  assert.equal(senderPnMessage.sender, '6281234567890@s.whatsapp.net');
});

test('normalizer identifies newsletter channel posts and extracts publisher identity without using channel JID', () => {
  const post = normalizeMessage({
    key: { remoteJid: '120363000000000000@newsletter', id: 'channel-post-1' },
    newsletterMeta: { adminProfile: { id: '6281234567890@s.whatsapp.net', name: 'Channel Owner' } },
    message: { extendedTextMessage: { text: '.get https://example.com' } }
  }, {});
  assert.equal(post.isNewsletter, true);
  assert.equal(post.isChannel, true);
  assert.equal(post.isGroup, false);
  assert.equal(post.isPrivate, false);
  assert.equal(post.sender, '6281234567890@s.whatsapp.net');
  assert.equal(post.pushName, 'Channel Owner');
  assert.equal(post.body, '.get https://example.com');

  const unknownPublisher = normalizeMessage({
    key: { remoteJid: '120363000000000000@newsletter', id: 'channel-post-2' },
    message: { conversation: '.get' }
  }, {});
  assert.equal(unknownPublisher.isNewsletter, true);
  assert.equal(unknownPublisher.sender, '');
  assert.deepEqual(unknownPublisher.senderCandidates, []);
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


test('dispatcher returns an informative, actionable and privacy-safe plugin failure report', async () => {
  const registry = new PluginRegistry();
  registry.register(plugin({ execute: async () => { const error = new TypeError('client.downloadMedia is not a function'); error.code = 'PLUGIN_TYPE_ERROR'; throw error; } }));
  const errors = [];
  const logger = { info() {}, warn() {}, error(...args) { errors.push(args); }, debug() {} };
  const dispatcher = new CommandDispatcher({ registry, logger, rateLimit: 0 });
  const replies = [];
  const ctx = { m: { id: 'plugin-error-report' }, command: 'ping', isOwner: false, isGroup: false, isPrivate: true, publicMode: true, reply: async text => replies.push(text) };
  const result = await dispatcher.dispatch(ctx);
  assert.ok(result.reference);
  assert.match(replies[0], /FITUR GAGAL DIPROSES/);
  assert.match(replies[0], /PLUGIN.*ping/);
  assert.match(replies[0], /KEMUNGKINAN PENYEBAB/);
  assert.match(replies[0], /LANGKAH PERBAIKAN/);
  assert.match(replies[0], new RegExp(result.reference));
  assert.equal(errors[0][1].reference, result.reference);
  assert.match(diagnosePluginError(new Error('fetch failed')).cause, /Layanan eksternal/);
  const safe = formatPluginFailure({ plugin: 'test', command: 'ping', error: new Error('request failed https://private.example/path?token=secret'), reference: 'ABC123' });
  assert.doesNotMatch(safe, /private\.example|token=secret/);
});


test('plugin failure reports redact credentials and event failures receive trace references', async () => {
  const unsafe = formatPluginFailure({
    plugin: 'test', command: 'ping',
    error: new Error('Authorization: Bearer abc.def.secret api_key=hidden https://private.example/path'),
    reference: 'SAFE1234'
  });
  assert.doesNotMatch(unsafe, /abc\\.def\\.secret|hidden|private\\.example/);
  assert.match(unsafe, /disamarkan/);

  const registry = new PluginRegistry();
  registry.register(plugin({
    name: 'group-events', commands: ['eventtest'], events: ['group-participants.update'],
    onEvent: async () => { throw Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }); }
  }));
  const logged = [];
  const dispatcher = new CommandDispatcher({
    registry,
    logger: { info() {}, warn() {}, error(...args) { logged.push(args); }, debug() {} }
  });
  const results = await dispatcher.dispatchEvent('group-participants.update', {}, {});
  assert.equal(results.length, 1);
  assert.equal(results[0].ok, false);
  assert.ok(results[0].reference);
  assert.equal(logged[0][1].reference, results[0].reference);
  assert.equal(logged[0][1].stage, 'event');
  assert.match(logged[0][1].diagnosis.cause, /Layanan eksternal/);
});

test('dispatcher sends privacy-safe activity summary after a successful command', async () => {
  const registry = new PluginRegistry();
  registry.register(plugin({ execute: async () => {} }));
  const activities = [];
  const dispatcher = new CommandDispatcher({ registry, logger: { info() {}, warn() {}, error() {}, debug() {}, activity(event) { activities.push(event); } } });
  await dispatcher.dispatch({ m: { id: 'activity-one' }, command: 'ping', sender: '6281234567890@s.whatsapp.net', isOwner: true, isGroup: true, isPrivate: false, publicMode: true, reply: async () => {} });
  assert.equal(activities.length, 1);
  assert.deepEqual({ command: activities[0].command, plugin: activities[0].plugin, category: activities[0].category, scope: activities[0].scope }, { command: 'ping', plugin: 'ping', category: 'system', scope: 'group' });
  assert.equal(Object.hasOwn(activities[0], 'sender'), false);
  assert.equal(Object.hasOwn(activities[0], 'message'), false);
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


test('role permissions separate owner identity from group scope and group admin', () => {
  const ownerCommand = plugin({ permissions: { ownerOnly: true } });
  const ownerCategoryCommand = plugin({ category: 'owner', permissions: {} });
  const ownerInGroupCategory = plugin({ category: 'group', permissions: { ownerOnly: true } });
  const groupCommand = plugin({ permissions: { groupOnly: true } });
  const groupCategoryCommand = plugin({ category: 'group', permissions: {} });
  const adminCommand = plugin({ permissions: { groupOnly: true, adminOnly: true } });

  assert.deepEqual(
    validatePermission(ownerCategoryCommand, { isOwner: false, isGroup: true, isGroupAdmin: true }),
    { allowed: false, reason: 'owner' },
    'owner category is protected even if a plugin omitted ownerOnly'
  );
  assert.deepEqual(
    validatePermission(ownerInGroupCategory, { isOwner: true, isGroup: false, isPrivate: true }),
    { allowed: true },
    'explicit owner-only commands in group category remain owner-only, not group-admin commands'
  );
  assert.deepEqual(
    validatePermission(ownerInGroupCategory, { isOwner: false, isGroup: true, isGroupAdmin: true }),
    { allowed: false, reason: 'owner' }
  );
  assert.deepEqual(
    validatePermission(groupCategoryCommand, { isOwner: true, isGroup: false, isPrivate: true }),
    { allowed: false, reason: 'group' },
    'group category is never executable in private chat'
  );
  assert.deepEqual(
    validatePermission(groupCategoryCommand, { isOwner: false, isGroup: true, isGroupAdmin: false }),
    { allowed: false, reason: 'admin' },
    'group category is restricted to group admins and bot owner by default'
  );
  assert.deepEqual(
    validatePermission(groupCategoryCommand, { isOwner: false, isGroup: true, isGroupAdmin: true }),
    { allowed: true }
  );
  assert.deepEqual(
    validatePermission(ownerCommand, { isOwner: false, isGroup: true, isGroupAdmin: true }),
    { allowed: false, reason: 'owner' },
    'group admin must never inherit bot-owner privileges'
  );
  assert.deepEqual(
    validatePermission(ownerCommand, { isOwner: true, isGroup: false, isGroupAdmin: false }),
    { allowed: true },
    'bot owner may run owner-only commands in private chat'
  );
  assert.deepEqual(
    validatePermission(groupCommand, { isOwner: false, isGroup: false, isPrivate: true }),
    { allowed: false, reason: 'group' }
  );
  assert.deepEqual(
    validatePermission(groupCommand, { isOwner: false, isGroup: true, isGroupAdmin: false }),
    { allowed: true },
    'group-scoped commands may be used by group participants unless adminOnly is also set'
  );
  assert.deepEqual(
    validatePermission(adminCommand, { isOwner: false, isGroup: true, isGroupAdmin: true }),
    { allowed: true }
  );
  assert.deepEqual(
    validatePermission(adminCommand, { isOwner: true, isGroup: true, isGroupAdmin: false }),
    { allowed: true },
    'owner may administer group-scoped admin commands by default'
  );
  assert.deepEqual(
    validatePermission(adminCommand, { isOwner: false, isGroup: true, isGroupAdmin: false }),
    { allowed: false, reason: 'admin' }
  );
  assert.deepEqual(
    validatePermission(adminCommand, { isOwner: true, isGroup: false, isGroupAdmin: false }),
    { allowed: false, reason: 'group' },
    'admin-only commands still require a group context'
  );
});

test('dispatcher blocks owner-only commands from group admins and group-only commands in private chat', async () => {
  const registry = new PluginRegistry();
  const executions = [];
  registry.register(plugin({ name: 'owner-command', commands: ['ownerop'], category: 'owner', permissions: {}, execute: async () => executions.push('owner') }));
  registry.register(plugin({ name: 'group-command', commands: ['groupop'], category: 'group', permissions: {}, execute: async () => executions.push('group') }));
  const dispatcher = new CommandDispatcher({ registry, logger: { info() {}, warn() {}, error() {} }, rateLimit: 0 });
  const replies = [];
  const base = { isPrivate: false, publicMode: true, reply: async message => replies.push(message) };

  const adminAttempt = await dispatcher.dispatch({ ...base, m: { id: 'owner-admin-attempt' }, command: 'ownerop', isGroup: true, isOwner: false, isGroupAdmin: true, profile: { registered: true } });
  assert.equal(adminAttempt.reason, 'owner');
  assert.match(replies.at(-1), /khusus owner/i);

  const privateAttempt = await dispatcher.dispatch({ ...base, m: { id: 'group-private-attempt' }, command: 'groupop', isGroup: false, isPrivate: true, isOwner: true, isGroupAdmin: false });
  assert.equal(privateAttempt.reason, 'group');
  assert.match(replies.at(-1), /hanya dapat digunakan di grup/i);
  assert.deepEqual(executions, []);
});


test('role and explicit access grants control access to protected plugins', () => {
  const protectedPlugin = plugin({ permissions: { accessRequired: true } });
  const rolePlugin = plugin({ permissions: { minRole: 'premium' } });
  assert.deepEqual(validatePermission(protectedPlugin, { isOwner: false, isGroup: true, isRegistered: true, userRole: 'user', userAccess: { commands: [], categories: [] }, command: 'ping' }), { allowed: false, reason: 'role' });
  assert.deepEqual(validatePermission(protectedPlugin, { isOwner: false, isGroup: true, isRegistered: true, userRole: 'user', userAccess: { commands: ['ping'], categories: [] }, command: 'ping' }), { allowed: true });
  assert.deepEqual(validatePermission(protectedPlugin, { isOwner: false, isGroup: true, isRegistered: true, userRole: 'user', userAccess: { commands: [], categories: ['system'] }, command: 'ping' }), { allowed: true });
  assert.deepEqual(validatePermission(rolePlugin, { isOwner: false, isGroup: true, isRegistered: true, userRole: 'user' }), { allowed: false, reason: 'role' });
  assert.deepEqual(validatePermission(rolePlugin, { isOwner: false, isGroup: true, isRegistered: true, userRole: 'premium' }), { allowed: true });
  assert.deepEqual(validatePermission(protectedPlugin, { isOwner: false, isGroup: true, isRegistered: false, userRole: 'user', userAccess: { commands: ['ping'], categories: [] }, command: 'ping' }), { allowed: false, reason: 'registration' });
  assert.deepEqual(validatePermission(plugin({ permissions: { registrationExempt: true } }), { isOwner: false, isGroup: true, isRegistered: false }), { allowed: true });
});

test('dispatcher requires group registration before built-in menus and normal plugins', async () => {
  const registry = new PluginRegistry();
  let executed = 0;
  registry.register(plugin({ execute: async () => { executed += 1; } }));
  const dispatcher = new CommandDispatcher({ registry, logger: { info() {}, warn() {}, error() {} }, rateLimit: 0 });
  const replies = [];
  const ctx = { m: { id: 'unregistered-group' }, command: 'ping', isGroup: true, isOwner: false, profile: { registered: false }, prefix: '.', reply: async message => replies.push(message) };
  const result = await dispatcher.dispatch(ctx);
  assert.equal(result.reason, 'registration');
  assert.equal(executed, 0);
  assert.match(replies[0], /\.daftar nama/);
});


test('explicit owner grants override role requirements without overriding owner-only checks', () => {
  const premiumFeature = plugin({ permissions: { roles: ['premium'] } });
  assert.deepEqual(validatePermission(premiumFeature, { isOwner: false, isGroup: true, isRegistered: true, userRole: 'user', userAccess: { commands: ['ping'], categories: [] }, command: 'ping' }), { allowed: true });
  assert.deepEqual(validatePermission(plugin({ category: 'owner', permissions: { accessRequired: true } }), { isOwner: false, isGroup: true, isRegistered: true, userRole: 'moderator', userAccess: { commands: ['ping'], categories: ['owner'] }, command: 'ping' }), { allowed: false, reason: 'owner' });
});
