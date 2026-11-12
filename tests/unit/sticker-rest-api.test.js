'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../../plugins/media/sticker-rest-api');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const GIF = Buffer.from('GIF89a\x01\x00\x01\x00', 'binary');

function makeContext(args, { downloadBuffer, logger = { warn() {}, debug() {} }, asepharyanaEnabled = false } = {}) {
  const sent = [];
  const replies = [];
  const reactions = [];
  return {
    ctx: {
      args, prefix: '.', command: 'stickerapi', text: args.slice(1).join(' '), chat: 'chat@s.whatsapp.net', m: { raw: { key: { id: 'm1' } } },
      config: { sticker: { packname: 'BASEBOT', author: 'test', apis: { asepharyanaEnabled } } }, logger,
      services: { media: { downloadBuffer } },
      client: {
        async sendImageAsSticker(...values) { sent.push(['image', ...values]); },
        async sendVideoAsSticker(...values) { sent.push(['video', ...values]); }
      },
      async reply(message) { replies.push(message); }, async react(value) { reactions.push(value); }
    }, sent, replies, reactions
  };
}

test('sticker REST help describes the available generated sticker modes', async () => {
  const { ctx, replies } = makeContext([]);
  await plugin.execute(ctx);
  assert.match(replies[0], /stickerapi brat/);
  assert.match(replies[0], /stickerapi animated/);
});

test('static Brat uses bounded public API downloads and converts verified PNG to WhatsApp sticker', async () => {
  const calls = [];
  const { ctx, sent, reactions } = makeContext(['brat', 'hello', '& world'], {
    downloadBuffer: async (url, options) => { calls.push({ url, options }); return { buffer: PNG, contentType: 'image/png' }; }
  });
  await plugin.execute(ctx);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/api\.siputzx\.my\.id\/api\/m\/brat\?/);
  assert.match(calls[0].url, /text=hello%20%26%20world/);
  assert.equal(calls[0].options.maxBytes, 8 * 1024 * 1024);
  assert.equal(calls[0].options.timeoutMs, 15000);
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], 'image');
  assert.deepEqual(sent[0][4], { packname: 'BASEBOT', author: 'test' });
  assert.deepEqual(reactions, ['⚡']);
});

test('animated mode validates GIF signature and converts to animated WhatsApp sticker', async () => {
  const calls = [];
  const { ctx, sent } = makeContext(['animated', 'hello'], {
    downloadBuffer: async url => { calls.push(url); return { buffer: GIF, contentType: 'image/gif' }; }
  });
  await plugin.execute(ctx);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /isAnimated=true/);
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], 'video');
});

test('failed primary provider falls back to verified Asepharyana PNG without logging user text', async () => {
  const calls = [];
  const warnings = [];
  const { ctx, sent } = makeContext(['brat', 'private text'], {
    logger: { warn: (...args) => warnings.push(args), debug() {} },
    asepharyanaEnabled: true,
    downloadBuffer: async (url) => {
      calls.push(url);
      if (calls.length === 1) throw new Error('simulated timeout');
      return { buffer: PNG, contentType: 'application/octet-stream' };
    }
  });
  await plugin.execute(ctx);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /^https:\/\/scraper\.asepharyana\.my\.id\/image\/brat\?/);
  assert.equal(sent.length, 1);
  assert.doesNotMatch(JSON.stringify(warnings), /private text/);
});

test('invalid HTML or wrong media signature never reaches sticker converter and gets fallback', async () => {
  let calls = 0;
  const { ctx, sent, replies } = makeContext(['brat', 'hello'], {
    asepharyanaEnabled: true,
    downloadBuffer: async () => { calls += 1; return { buffer: Buffer.from('<html>bad</html>'), contentType: 'image/png' }; }
  });
  await plugin.execute(ctx);
  assert.equal(calls, 2);
  assert.equal(sent.length, 0);
  assert.match(replies[0], /tidak tersedia|tidak valid/i);
});

test('alternate API host stays disabled by default when the primary API fails', async () => {
  let calls = 0;
  const { ctx, replies } = makeContext(['brat', 'hello'], {
    downloadBuffer: async () => { calls += 1; throw new Error('simulated outage'); }
  });
  await plugin.execute(ctx);
  assert.equal(calls, 1);
  assert.match(replies[0], /tidak tersedia/);
});

test('unknown modes are rejected without outbound requests', async () => {
  let calls = 0;
  const { ctx, replies } = makeContext(['upload-url', 'https://example.org'], {
    downloadBuffer: async () => { calls += 1; throw new Error('must not be called'); }
  });
  await plugin.execute(ctx);
  assert.equal(calls, 0);
  assert.match(replies[0], /Mode tidak dikenal/);
});
