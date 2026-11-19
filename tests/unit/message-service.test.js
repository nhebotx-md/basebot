'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMessageService } = require('../../src/core/services/message.service');

function createClient() {
  const calls = [];
  return {
    calls,
    async sendMessage(...args) {
      calls.push(args);
      return { key: { id: 'sent-message' } };
    }
  };
}

test('command replies render the invoked command as a WhatsApp blockquote', async () => {
  const client = createClient();
  const service = createMessageService(client, { commandQuote: '.ping' });
  await service.reply({ chat: 'chat' }, 'Pong!');
  assert.equal(client.calls[0][1].text, '> .ping\n\nPong!');
});

test('command sendMessage formats text and captions without mutating the original payload', async () => {
  const client = createClient();
  const service = createMessageService(client, { commandQuote: '.sticker' });
  const payload = { text: 'Sticker berhasil dibuat.', caption: 'Hasil sticker' };
  await service.sendMessage('chat', payload);
  assert.equal(client.calls[0][1].text, '> .sticker\n\nSticker berhasil dibuat.');
  assert.equal(client.calls[0][1].caption, '> .sticker\n\nHasil sticker');
  assert.equal(payload.text, 'Sticker berhasil dibuat.');
  assert.equal(payload.caption, 'Hasil sticker');
});

test('command header is not duplicated when a message is already formatted', async () => {
  const client = createClient();
  const service = createMessageService(client, { commandQuote: '.menu' });
  await service.sendMessage('chat', { text: '> .menu\n\nMenu utama' });
  assert.equal(client.calls[0][1].text, '> .menu\n\nMenu utama');
});

test('messages outside command context keep their original formatting', async () => {
  const client = createClient();
  const service = createMessageService(client);
  await service.reply({ chat: 'chat' }, 'Pesan biasa');
  assert.equal(client.calls[0][1].text, 'Pesan biasa');
});
