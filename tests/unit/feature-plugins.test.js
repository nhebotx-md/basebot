'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const poll = require('../../plugins/message/poll');
const actions = require('../../plugins/message/actions');
const interactiveMenu = require('../../plugins/tools/interactive-menu');
const groupInfo = require('../../plugins/group/group-info');
const groupSettings = require('../../plugins/group/group-settings');
const groupMembers = require('../../plugins/group/group-members');
const groupRequests = require('../../plugins/group/group-requests');
const groupRequestAction = require('../../plugins/group/group-request-action');
const { PluginRegistry } = require('../../src/core/plugins/plugin-registry');

function baseContext(overrides = {}) {
  const replies = [];
  const sent = [];
  return {
    command: '', text: '', prefix: '.', chat: '120363000000000000@g.us',
    isGroup: true, isPrivate: false, isGroupAdmin: true, isBotAdmin: true,
    m: { raw: { key: { id: 'command' } }, mentionedJid: [] },
    client: { user: { id: '628123@s.whatsapp.net' }, async sendMessage(...args) { sent.push(args); } },
    async reply(text) { replies.push(String(text)); },
    async sendMessage(...args) { sent.push(args); },
    replies, sent, ...overrides
  };
}

test('group admin plugins register separate read and bot-admin-gated capabilities', () => {
  assert.deepEqual(groupInfo.commands, ['groupinfo', 'grupinfo']);
  assert.equal(groupInfo.permissions.botAdminOnly, false);
  assert.equal(groupSettings.permissions.botAdminOnly, true);
  assert.equal(groupMembers.permissions.botAdminOnly, true);
  assert.equal(groupRequests.permissions.botAdminOnly, false);
  assert.equal(groupRequestAction.permissions.botAdminOnly, true);
});

test('group settings call only the validated Baileys setting operation', async () => {
  const calls = [];
  const ctx = baseContext({
    command: 'grupset', text: 'pengumuman on',
    client: { async groupSettingUpdate(...args) { calls.push(args); } }
  });
  await groupSettings.execute(ctx);
  assert.deepEqual(calls, [['120363000000000000@g.us', 'announcement']]);
  assert.match(ctx.replies[0], /hanya admin/);

  const invalid = baseContext({ command: 'grupset', text: 'pengumuman maybe' });
  await groupSettings.execute(invalid);
  assert.match(invalid.replies[0], /Format/);
});

test('member mutations require exactly one mention and use Baileys groupParticipantsUpdate', async () => {
  const calls = [];
  const ctx = baseContext({
    command: 'anggota', text: 'promote',
    m: { mentionedJid: ['628111@s.whatsapp.net'] },
    client: { async groupParticipantsUpdate(...args) { calls.push(args); } }
  });
  await groupMembers.execute(ctx);
  assert.deepEqual(calls, [['120363000000000000@g.us', ['628111@s.whatsapp.net'], 'promote']]);

  const noMention = baseContext({ command: 'anggota', text: 'remove', m: { mentionedJid: [] } });
  await groupMembers.execute(noMention);
  assert.match(noMention.replies[0], /mention/);
});

test('join request actions do nothing unless the mentioned user is pending', async () => {
  const calls = [];
  const ctx = baseContext({
    command: 'joinrequest', text: 'approve',
    m: { mentionedJid: ['628111@s.whatsapp.net'] },
    client: {
      async groupRequestParticipantsList() { return [{ jid: '628222@s.whatsapp.net' }]; },
      async groupRequestParticipantsUpdate(...args) { calls.push(args); }
    }
  });
  await groupRequestAction.execute(ctx);
  assert.equal(calls.length, 0);
  assert.match(ctx.replies[0], /tidak ditemukan/);
});

test('poll creation validates options, stores message, and results expose counts without voter IDs', async () => {
  const chat = '120363000000000000@g.us';
  const pollMessage = {
    key: { id: 'poll-id', remoteJid: chat, fromMe: true },
    message: { pollCreationMessage: { name: 'Pilih', options: [{ optionName: 'Setuju' }, { optionName: 'Tidak' }] } }
  };
  const ctx = baseContext({
    command: 'poll', text: 'Pilih | Setuju | Tidak',
    async sendMessage(...args) { this.sent.push(args); return pollMessage; }
  });
  await poll.execute(ctx);
  assert.equal(ctx.sent[0][1].poll.name, 'Pilih');
  assert.deepEqual(ctx.sent[0][1].poll.values, ['Setuju', 'Tidak']);

  const selectedHash = createHash('sha256').update(Buffer.from('Setuju')).digest();
  await poll.onEvent({ client: ctx.client }, [{
    key: { id: 'poll-id', remoteJid: chat },
    update: { pollUpdates: [{ pollUpdateMessageKey: { participant: '628999@s.whatsapp.net' }, vote: { selectedOptions: [selectedHash] } }] }
  }]);

  const resultContext = baseContext({
    command: 'pollhasil', chat,
    quoted: { key: { id: 'poll-id', remoteJid: chat } },
    client: ctx.client
  });
  await poll.execute(resultContext);
  assert.match(resultContext.replies[0], /Setuju: 1/);
  assert.doesNotMatch(resultContext.replies[0], /628999/);

  const invalid = baseContext({ command: 'poll', text: 'Pertanyaan | satu' });
  await poll.execute(invalid);
  assert.match(invalid.replies[0], /2–12 opsi/);
});

test('message actions fail closed for another person’s message, but allow a tracked bot message edit', async () => {
  const calls = [];
  const denied = baseContext({
    command: 'edit', text: 'ubah', quoted: { key: { id: 'other', remoteJid: '120363000000000000@g.us', fromMe: false } }
  });
  await actions.execute(denied);
  assert.equal(denied.replies.length, 1);
  assert.equal(denied.sent.length, 0);

  const allowed = baseContext({
    command: 'edit', text: 'teks baru',
    quoted: { key: { id: 'own', remoteJid: '120363000000000000@g.us', fromMe: true } },
    client: { async sendMessage(...args) { calls.push(args); } }
  });
  await actions.execute(allowed);
  assert.equal(calls[0][1].text, 'teks baru');
  assert.equal(calls[0][1].edit.id, 'own');
});

test('interactive menu lists only permission-visible categories with executable catmenu row IDs', async () => {
  const registry = new PluginRegistry();
  registry.register({ name: 'media-sticker', commands: ['sticker'], category: 'media', description: 'Sticker', usage: '.sticker', permissions: {}, execute: async () => {} });
  registry.register({ name: 'private-owner', commands: ['secret'], category: 'owner', description: 'Secret', usage: '.secret', permissions: {}, execute: async () => {} });
  const ctx = baseContext({
    isGroup: false, isPrivate: true, isGroupAdmin: false, isOwner: false, publicMode: true,
    userRole: 'user', isRegistered: true, userAccess: { commands: [], categories: [] },
    registry, m: { raw: { id: 'invoker' } }, config: { prefix: '.' }
  });
  await interactiveMenu.execute(ctx);
  const payload = ctx.sent[0][1];
  assert.equal(payload.buttons[0].text, 'Pilih kategori');
  assert.equal(payload.buttons[0].sections[0].rows.length, 1);
  assert.equal(payload.buttons[0].sections[0].rows[0].id, '.catmenu media');
  assert.match(payload.text, /\.catmenu media/);
  assert.equal(ctx.sent[0][2].quoted.id, 'invoker');
});
