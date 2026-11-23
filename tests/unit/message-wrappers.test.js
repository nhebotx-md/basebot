'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../../plugins/message/message-wrappers.handler.cjs');

function context(command, mediaType = 'imageMessage', buffer = Buffer.from('media')) {
  const sent = [];
  const raw = { key: { id: 'command' } };
  const quoted = {
    mtype: mediaType,
    msg: { mimetype: mediaType === 'videoMessage' ? 'video/mp4' : mediaType === 'imageMessage' ? 'image/jpeg' : 'audio/ogg' },
    async download() { return buffer; }
  };
  return {
    command, prefix: '.', text: 'caption test', chat: 'chat', quoted, m: { raw },
    mime: quoted.msg.mimetype, sent,
    async sendMessage(...args) { sent.push(args); },
    async reply(message) { sent.push(['reply', message]); }
  };
}

for (const [command, flag] of [['spoiler', 'spoiler'], ['viewonce', 'viewOnce'], ['ephemeral', 'ephemeral']]) {
  test(command + ' wrapper sends a quoted image with the matching Baileys flag', async () => {
    const ctx = context(command);
    await plugin.execute(ctx);
    assert.equal(ctx.sent.length, 1);
    assert.equal(ctx.sent[0][1][flag], true);
    assert.equal(ctx.sent[0][1].caption, 'caption test');
    assert.equal(Buffer.isBuffer(ctx.sent[0][1].image), true);
    assert.deepEqual(ctx.sent[0][2], { quoted: ctx.m.raw });
  });
}

test('message wrapper accepts video and preserves its MIME type', async () => {
  const ctx = context('viewonce', 'videoMessage');
  await plugin.execute(ctx);
  assert.equal(ctx.sent[0][1].viewOnce, true);
  assert.equal(ctx.sent[0][1].mimetype, 'video/mp4');
  assert.equal(Buffer.isBuffer(ctx.sent[0][1].video), true);
});

test('message wrapper rejects unsupported media and oversized buffers', async () => {
  const audio = context('spoiler', 'audioMessage');
  await plugin.execute(audio);
  assert.match(audio.sent[0][1], /gambar atau video/);
  const oversized = context('viewonce', 'imageMessage', Buffer.alloc(20 * 1024 * 1024 + 1));
  await plugin.execute(oversized);
  assert.match(oversized.sent[0][1], /20 MB/);
});
