'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFakeQuoted, FAKE_QUOTED_JID } = require('../../src/core/messaging/fake-quoted');
const { createMessageService } = require('../../src/core/services/message.service');

test('createFakeQuoted returns the exact configured contact quote structure', () => {
  const quoted = createFakeQuoted('ShooNhee-AI', true);
  assert.deepEqual(quoted, {
    key: {
      fromMe: false,
      participant: FAKE_QUOTED_JID,
      remoteJid: FAKE_QUOTED_JID
    },
    message: {
      contactMessage: {
        displayName: '✅ ShooNhee-AI',
        vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:ShooNhee-AI\nORG:Verified Bot\nEND:VCARD'
      }
    }
  });
});

test('createFakeQuoted supports the unverified label', () => {
  const quoted = createFakeQuoted('ShooNhee-AI', false);
  assert.equal(quoted.message.contactMessage.displayName, 'ShooNhee-AI');
  assert.match(quoted.message.contactMessage.vcard, /ORG:Bot/);
});

test('reply uses the configured fake quote by default and preserves explicit quoted overrides', async () => {
  const sent = [];
  const client = { sendMessage: async (...args) => { sent.push(args); return { key: { id: 'sent' } }; } };
  const service = createMessageService(client, { botName: 'ShooNhee-AI' });
  const message = { chat: '120363000000000000@g.us', raw: { key: { id: 'incoming' } } };
  await service.reply(message, 'Halo');
  assert.deepEqual(sent[0][2].quoted, createFakeQuoted('ShooNhee-AI', true));

  const original = { key: { id: 'original-quote' }, message: { conversation: 'original' } };
  await service.reply(message, 'Balasan asli', { quoted: original });
  assert.equal(sent[1][2].quoted, original);

  await service.reply(message, 'Tanpa kutipan', { quoted: null });
  assert.equal(sent[2][2].quoted, null);
});

test('sendMessage uses the same fake quote while reactions stay unquoted', async () => {
  const sent = [];
  const client = { sendMessage: async (...args) => { sent.push(args); } };
  const service = createMessageService(client, { botName: 'ShooNhee-AI' });
  await service.sendMessage('628123@s.whatsapp.net', { text: 'Hello' });
  assert.deepEqual(sent[0][2].quoted, createFakeQuoted('ShooNhee-AI', true));
  await service.react({ chat: '628123@s.whatsapp.net', key: { id: 'incoming' } }, '👍');
  assert.equal(Object.hasOwn(sent[1][2] || {}, 'quoted'), false);
});
