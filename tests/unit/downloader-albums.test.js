'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const igdl = require('../../plugins/downloader/download-igdl');
const tiktok = require('../../plugins/downloader/tiktok');

function baseContext(overrides = {}) {
  const albums = [];
  const messages = [];
  const updates = [];
  const ctx = {
    prefix: '.', command: 'igdl', text: 'https://instagram.com/p/example', chat: 'chat',
    m: { raw: { key: { id: 'command' } } },
    services: {
      downloaders: { async igdl() { return { data: [] }; }, async tiktok() { return {}; } },
      media: { async downloadBuffer() { return { buffer: Buffer.from('media'), contentType: 'image/jpeg' }; } }
    },
    client: { async albumMessage(...args) { albums.push(args); } },
    async sendMessage(...args) { messages.push(args); },
    async reply(message) { messages.push(['reply', message]); },
    progress: { async start() {}, async update(...args) { updates.push(args); }, async fail() {} },
    albums, messages, updates, ...overrides
  };
  return ctx;
}

test('Instagram carousel downloads validated media and sends one native mixed-media album', async () => {
  const ctx = baseContext();
  ctx.services.downloaders.igdl = async () => ({ data: [
    { url: 'https://8.8.8.8/one.jpg' },
    { url: 'https://8.8.8.8/two.mp4' }
  ] });
  let index = 0;
  ctx.services.media.downloadBuffer = async () => index++ === 0
    ? { buffer: Buffer.from('image'), contentType: 'image/jpeg' }
    : { buffer: Buffer.from('video'), contentType: 'video/mp4' };
  await igdl.execute(ctx);
  assert.equal(ctx.albums.length, 1);
  assert.equal(ctx.albums[0][1].length, 2);
  assert.ok(Buffer.isBuffer(ctx.albums[0][1][0].image));
  assert.ok(Buffer.isBuffer(ctx.albums[0][1][1].video));
  assert.equal(ctx.messages.length, 0);
});

test('TikTok slideshow downloads photos and sends them as one native album', async () => {
  const ctx = baseContext({ command: 'tt', text: 'https://tiktok.com/example slide' });
  ctx.services.downloaders.tiktok = async () => ({ title: 'Slideshow', images: [
    'https://8.8.8.8/one.jpg', 'https://8.8.8.8/two.jpg'
  ] });
  ctx.services.media.downloadBuffer = async () => ({ buffer: Buffer.from('image'), contentType: 'image/jpeg' });
  await tiktok.execute(ctx);
  assert.equal(ctx.albums.length, 1);
  assert.equal(ctx.albums[0][1].length, 2);
  assert.equal(ctx.albums[0][1][0].caption, 'Slideshow TikTok 1/2\nSlideshow');
  assert.equal(ctx.messages.length, 0);
});
