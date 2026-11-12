'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../../plugins/media/qc-sticker');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

function makeContext(args, { quotedText = '', response = { ok: true, status: 200, buffer: PNG }, avatar = true } = {}) {
  const sent = [];
  const replies = [];
  const reactions = [];
  const posts = [];
  const downloads = [];
  const ctx = {
    args, prefix: '.', command: 'qc', pushname: 'Test User', sender: '123@s.whatsapp.net',
    chat: '123@s.whatsapp.net', text: args.join(' '), quoted: quotedText ? { text: quotedText } : null,
    m: { raw: { key: { id: 'quoted-message' } } },
    config: { sticker: { packname: 'BASEBOT', author: 'test' } },
    client: {
      async profilePictureUrl() { if (!avatar) throw new Error('avatar unavailable'); return 'https://profile.example/avatar.png'; },
      async sendImageAsSticker(...values) { sent.push(values); }
    },
    services: {
      media: { async downloadBuffer(url, options) { downloads.push({ url, options }); return { buffer: PNG, contentType: 'image/png' }; } },
      http: { async postJsonPublic(url, payload, options) { posts.push({ url, payload, options }); return response; } }
    },
    async reply(value) { replies.push(value); }, async react(value) { reactions.push(value); }
  };
  return { ctx, sent, replies, reactions, posts, downloads };
}

test('qc sticker includes the requested color names, aliases, and hex colors', () => {
  assert.equal(plugin.resolveColor('pink'), '#f68ac9');
  assert.equal(plugin.resolveColor('DARKBLUE'), '#0d47a1');
  assert.equal(plugin.resolveColor('#12aBcD'), '#12abcd');
  assert.equal(plugin.resolveColor('#fff'), null);
  assert.equal(plugin.resolveColor('not-a-color'), null);
  assert.deepEqual(plugin.commands, ['qc', 'qcstc', 'stcqc', 'qcstic', 'qcstick', 'quotesticker']);
});

test('qc sticker sends a quote payload with custom color and validates the PNG response', async () => {
  const { ctx, sent, replies, reactions, posts, downloads } = makeContext(['pink', 'Hai', 'semuanya!']);
  await plugin.execute(ctx);
  assert.equal(replies.length, 0);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, 'https://brat.siputzx.my.id/quoted');
  assert.equal(posts[0].payload.backgroundColor, '#f68ac9');
  assert.equal(posts[0].payload.messages[0].text, 'Hai semuanya!');
  assert.equal(posts[0].payload.messages[0].from.first_name, 'Test User');
  assert.match(posts[0].payload.messages[0].from.photo.url, /^data:image\/png;base64,/);
  assert.equal(posts[0].payload.messages[0].avatar, true);
  assert.equal(posts[0].options.timeoutMs, 30000);
  assert.equal(posts[0].options.maxBytes, 8 * 1024 * 1024);
  assert.equal(downloads[0].options.maxBytes, 1024 * 1024);
  assert.equal(sent.length, 1);
  assert.equal(sent[0][1], PNG);
  assert.deepEqual(sent[0][3], { packname: 'BASEBOT', author: 'test' });
  assert.deepEqual(reactions, ['🕕', '✅']);
});

test('qc sticker uses the replied message when only a color is provided', async () => {
  const { ctx, posts, sent } = makeContext(['blue']);
  ctx.quoted = { text: '', msg: 'Pesan yang dibalas' };
  await plugin.execute(ctx);
  assert.equal(posts[0].payload.messages[0].text, 'Pesan yang dibalas');
  assert.equal(posts[0].payload.backgroundColor, '#6cace4');
  assert.equal(sent.length, 1);
});

test('qc sticker shows help and rejects invalid color or missing quote without calling external API', async () => {
  const missingColor = makeContext([]);
  await plugin.execute(missingColor.ctx);
  assert.match(missingColor.replies[0], /qc <warna/);
  const invalid = makeContext(['unknown', 'text']);
  await plugin.execute(invalid.ctx);
  assert.match(invalid.replies[0], /Warna/);
  assert.equal(invalid.posts.length, 0);
  const noQuote = makeContext(['pink']);
  await plugin.execute(noQuote.ctx);
  assert.match(noQuote.replies[0], /balas pesan|Masukkan teks/i);
  assert.equal(noQuote.posts.length, 0);
});

test('qc sticker enforces the 80-character limit before outbound request', async () => {
  const { ctx, posts, replies } = makeContext(['pink', 'x'.repeat(81)]);
  await plugin.execute(ctx);
  assert.match(replies[0], /maksimal 80/);
  assert.equal(posts.length, 0);
});

test('qc sticker does not attach an unavailable avatar and rejects invalid API media', async () => {
  const { ctx, posts, sent, replies } = makeContext(['#ff00aa', 'hello'], {
    avatar: false,
    response: { ok: true, status: 200, buffer: Buffer.from('<html>nope') }
  });
  await plugin.execute(ctx);
  assert.equal(posts[0].payload.messages[0].avatar, false);
  assert.equal(posts[0].payload.messages[0].from.photo.url, '');
  assert.equal(sent.length, 0);
  assert.match(replies[0], /gagal dibuat/);
});

test('qc sticker rejects non-2xx quote API responses', async () => {
  const { ctx, sent, replies } = makeContext(['pink', 'hello'], { response: { ok: false, status: 503, buffer: Buffer.from('unavailable') } });
  await plugin.execute(ctx);
  assert.equal(sent.length, 0);
  assert.match(replies[0], /API mungkin sedang tidak tersedia/);
});
