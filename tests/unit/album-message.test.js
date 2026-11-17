'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sendAlbumMessage, MAX_ALBUM_ITEMS } = require('../../src/integrations/whatsapp/client');

test('album helper sends multiple image and video items as one native album', async () => {
  const calls = [];
  const client = { async sendMessage(...args) { calls.push(args); return { key: { id: 'album' } }; } };
  const quoted = { key: { id: 'quoted' } };
  const items = [{ image: Buffer.from('image'), caption: 'Foto' }, { video: Buffer.from('video'), mimetype: 'video/mp4' }];
  const result = await sendAlbumMessage(client, '120363000000000000@g.us', items, quoted);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1], { album: items });
  assert.deepEqual(calls[0][2], { quoted });
  assert.deepEqual(result, { key: { id: 'album' } });
});

test('album helper sends a single item as a regular media message', async () => {
  const calls = [];
  const client = { async sendMessage(...args) { calls.push(args); return 'sent'; } };
  const item = { image: Buffer.from('image') };
  const result = await sendAlbumMessage(client, 'chat', [item]);
  assert.equal(result, 'sent');
  assert.deepEqual(calls, [['chat', item, {}]]);
});

test('album helper rejects empty, oversized, and invalid album payloads', async () => {
  const client = { async sendMessage() { throw new Error('must not send'); } };
  await assert.rejects(sendAlbumMessage(client, 'chat', []), /minimal satu media/);
  await assert.rejects(sendAlbumMessage(client, 'chat', Array.from({ length: MAX_ALBUM_ITEMS + 1 }, () => ({ image: Buffer.from('x') }))), /maksimal/);
  await assert.rejects(sendAlbumMessage(client, 'chat', [{ image: Buffer.from('x'), video: Buffer.from('y') }]), /tepat satu/);
  await assert.rejects(sendAlbumMessage(client, 'chat', [{ text: 'not media' }]), /tepat satu/);
});
