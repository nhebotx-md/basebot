'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../../plugins/sticker/brat');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const GIF = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0]);

function makeContext(command, args, { downloadBuffer } = {}) {
  const sent = [];
  const replies = [];
  const progressEvents = [];
  const progress = Object.assign(async () => {}, {
    async start(label) { progressEvents.push(['start', label]); },
    async update(label) { progressEvents.push(['update', label]); },
    async step(label) { progressEvents.push(['update', label]); },
    async complete(label) { progressEvents.push(['complete', label]); },
    async fail(label) { progressEvents.push(['fail', label]); },
    isStarted() { return progressEvents.length > 0; },
    isFinished() { return false; }
  });
  return {
    ctx: {
      command, args, prefix: '.', chat: 'chat@s.whatsapp.net',
      m: { raw: { key: { id: 'm1' } } },
      config: { sticker: { packname: 'MUSE-MD', author: 'test' } },
      progress, services: { media: { downloadBuffer } },
      client: {
        async sendImageAsSticker(...values) { sent.push(['image', ...values]); },
        async sendVideoAsSticker(...values) { sent.push(['video', ...values]); }
      },
      logger: { debug() {} },
      async reply(message) { replies.push(message); }
    },
    sent, replies, progressEvents
  };
}

test('Brat command creates a verified static PNG sticker', async () => {
  const calls = [];
  const { ctx, sent } = makeContext('brat', ['hello', '& world'], {
    downloadBuffer: async (url, options) => {
      calls.push({ url, options });
      return { buffer: PNG, contentType: 'image/png' };
    }
  });
  await plugin.execute(ctx);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.startsWith('https://api.siputzx.my.id/api/m/brat?'));
  assert.match(calls[0].url, /text=hello%20%26%20world/);
  assert.match(calls[0].url, /isAnimated=false/);
  assert.equal(calls[0].options.maxBytes, 8 * 1024 * 1024);
  assert.equal(calls[0].options.timeoutMs, 15000);
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], 'image');
});

test('Bratvid command creates a verified animated GIF sticker', async () => {
  const calls = [];
  const { ctx, sent } = makeContext('bratvid', ['hello'], {
    downloadBuffer: async url => {
      calls.push(url);
      return { buffer: GIF, contentType: 'image/gif' };
    }
  });
  await plugin.execute(ctx);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /isAnimated=true/);
  assert.match(calls[0], /delay=500/);
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], 'video');
});

test('stickerapi command keeps the explicit brat and animated modes', async () => {
  const { ctx, sent } = makeContext('stickerapi', ['animated', 'hello'], {
    downloadBuffer: async () => ({ buffer: GIF, contentType: 'image/gif' })
  });
  await plugin.execute(ctx);
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], 'video');
});

test('wrong or invalid media is never passed to the sticker converter', async () => {
  const { ctx, sent, replies } = makeContext('brat', ['hello'], {
    downloadBuffer: async () => ({ buffer: Buffer.from('<html>error</html>'), contentType: 'image/png' })
  });
  await plugin.execute(ctx);
  assert.equal(sent.length, 0);
  assert.match(replies[0], /gagal dibuat/i);
});

test('text length is limited before calling the provider', async () => {
  let calls = 0;
  const { ctx, sent, replies } = makeContext('brat', ['x'.repeat(301)], {
    downloadBuffer: async () => { calls += 1; return { buffer: PNG, contentType: 'image/png' }; }
  });
  await plugin.execute(ctx);
  assert.equal(calls, 0);
  assert.equal(sent.length, 0);
  assert.match(replies[0], /maksimal 300/);
});

test('unknown mode is rejected without outbound request', async () => {
  let calls = 0;
  const { ctx, replies } = makeContext('stickerapi', ['unknown', 'hello'], {
    downloadBuffer: async () => { calls += 1; throw new Error('must not be called'); }
  });
  await plugin.execute(ctx);
  assert.equal(calls, 0);
  assert.match(replies[0], /Mode tidak dikenal/);
});
