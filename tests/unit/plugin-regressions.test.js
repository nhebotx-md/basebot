'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePermission } = require('../../src/core/security/permission-manager');
const hidetag = require('../../plugins/group/hidetag');
const welcome = require('../../plugins/group/welcome');
const { createMessagesUpsertHandler } = require('../../src/core/events/messages-upsert');

test('tagall requires group admin even when the caller is an owner', () => {
  assert.deepEqual(validatePermission({ permissions: { groupOnly: true, adminOnly: true, ownerAdminBypass: false } }, { isGroup: true, isGroupAdmin: false, isOwner: true }), { allowed: false, reason: 'admin' });
  assert.deepEqual(validatePermission({ permissions: { groupOnly: true, adminOnly: true } }, { isGroup: true, isGroupAdmin: false, isOwner: true }), { allowed: true });
});

test('hidetag forwards quoted content and adds mentions for every group participant', async () => {
  let sent;
  await hidetag.execute({ groupMetadata: { participants: [{ id: '111@s.whatsapp.net' }, { id: '222@s.whatsapp.net' }] }, quoted: { raw: { key: { id: 'quote' }, message: { conversation: 'forwarded text' } } }, chat: 'g@g.us', text: 'caption', async sendMessage(...args) { sent = args; } });
  assert.equal(sent[1].forward.message.conversation, 'forwarded text');
  assert.equal(sent[1].force, true);
  assert.deepEqual(sent[1].mentions, ['111@s.whatsapp.net', '222@s.whatsapp.net']);
});

test('welcome supports promote/demote and does not greet the bot itself', async () => {
  const sent = [];
  const ctx = { config: { welcomeEnabled: true }, client: { user: { id: '999@s.whatsapp.net' }, decodeJid: x => x, async groupMetadata() { return { subject: 'Test Group' }; }, async sendMessage(...args) { sent.push(args); } } };
  await welcome.onEvent(ctx, { id: 'g@g.us', participants: ['999@s.whatsapp.net', '111@s.whatsapp.net'], action: 'add' });
  await welcome.onEvent(ctx, { id: 'g@g.us', participants: ['111@s.whatsapp.net'], author: '222@s.whatsapp.net', action: 'promote' });
  await welcome.onEvent(ctx, { id: 'g@g.us', participants: ['111@s.whatsapp.net'], author: '222@s.whatsapp.net', action: 'demote' });
  assert.equal(sent.length, 3);
  assert.match(sent[0][1].text, /Selamat datang/);
  assert.match(sent[1][1].text, /menjadikan.*admin/);
  assert.match(sent[2][1].text, /mencabut status admin/);
});

test('messages-upsert deletes groupStatusMentionMessage without dispatching it', async () => {
  let deletion; let dispatched = 0;
  const handler = createMessagesUpsertHandler({ config: { prefix: '.' }, registry: { getByCommand() {} }, logger: { info() {}, warn() {}, error() {} }, dispatcher: { async dispatch() { dispatched += 1; } } });
  const client = { public: true, async sendMessage(...args) { deletion = args; } };
  await handler(client, { type: 'notify', messages: [{ key: { id: 'status1', remoteJid: '123@g.us' }, message: { groupStatusMentionMessage: {} } }] }, {});
  assert.equal(deletion[0], '123@g.us');
  assert.equal(deletion[1].delete.id, 'status1');
  assert.equal(dispatched, 0);
});
