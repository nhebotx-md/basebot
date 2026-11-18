'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFakeQuoted, FAKE_QUOTED_JID } = require('../../src/core/messaging/fake-quoted');
const { createMessageService } = require('../../src/core/services/message.service');

test('createFakeQuoted builds a Baileys-compatible contact quote scoped to the destination chat', () => {
  const quoted = createFakeQuoted('ShooNhee-AI', true, '120363000000000000@g.us');
  assert.match(quoted.key.id, /^FAKE[A-F0-9]{18}$/);
  assert.equal(quoted.key.fromMe, false);
  assert.equal(quoted.key.participant, FAKE_QUOTED_JID);
  assert.equal(quoted.key.remoteJid, '120363000000000000@g.us');
  assert.equal(quoted.message.contactMessage.displayName, '✅ ShooNhee-AI');
  assert.match(quoted.message.contactMessage.vcard, /ORG:Verified Bot/);
  assert.ok(Number.isInteger(quoted.messageTimestamp));
  assert.equal(quoted.pushName, 'ShooNhee-AI');
});

test('each fake quote receives a distinct stanza ID', () => {
  const first = createFakeQuoted();
  const second = createFakeQuoted();
  assert.notEqual(first.key.id, second.key.id);
});

test('createFakeQuoted supports an unverified label and sanitizes vCard fields', () => {
  const quoted = createFakeQuoted('Bot\nORG:Injected', false, '628123@s.whatsapp.net');
  assert.equal(quoted.message.contactMessage.displayName, 'Bot ORG:Injected');
  assert.doesNotMatch(quoted.message.contactMessage.vcard, /\nORG:Injected/);
  assert.match(quoted.message.contactMessage.vcard, /ORG:Bot/);
});

test('reply uses the fake quote by default and preserves explicit quoted overrides', async () => {
  const sent = [];
  const client = { sendMessage: async (...args) => { sent.push(args); return { key: { id: 'sent' } }; } };
  const service = createMessageService(client, { botName: 'ShooNhee-AI' });
  const message = { chat: '120363000000000000@g.us', raw: { key: { id: 'incoming' } } };
  await service.reply(message, 'Halo');
  assert.equal(sent[0][2].quoted.key.remoteJid, message.chat);
  assert.equal(sent[0][2].quoted.message.contactMessage.displayName, '✅ ShooNhee-AI');
  assert.ok(sent[0][2].quoted.key.id);

  const original = { key: { id: 'original-quote' }, message: { conversation: 'original' } };
  await service.reply(message, 'Balasan asli', { quoted: original });
  assert.equal(sent[1][2].quoted, original);

  await service.reply(message, 'Tanpa kutipan', { quoted: null });
  assert.equal(sent[2][2].quoted, null);
});

test('sendMessage uses the same default quote while reactions stay unquoted', async () => {
  const sent = [];
  const client = { sendMessage: async (...args) => { sent.push(args); } };
  const service = createMessageService(client, { botName: 'ShooNhee-AI' });
  await service.sendMessage('628123@s.whatsapp.net', { text: 'Hello' });
  assert.equal(sent[0][2].quoted.key.remoteJid, '628123@s.whatsapp.net');
  await service.react({ chat: '628123@s.whatsapp.net', key: { id: 'incoming' } }, '👍');
  assert.equal(Object.hasOwn(sent[1][2] || {}, 'quoted'), false);
});
