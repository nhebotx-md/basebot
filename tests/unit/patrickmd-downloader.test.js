'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const facebook = require('../../plugins/downloader/facebook');
const fb = require('../../plugins/downloader/fb');
const fbdl = require('../../plugins/downloader/fbdl');
const fbvideo = require('../../plugins/downloader/fbvideo');

test('Facebook downloader sends a yt-dlp fallback buffer without Soclip media URLs', async () => {
  const messages = [];
  const ctx = {
    prefix: '.', command: 'fb', text: 'https://www.facebook.com/watch/?v=123', chat: 'chat',
    m: { raw: { key: { id: 'command' } } },
    services: {
      downloaders: {
        async facebook() { return { buffer: Buffer.from('video'), contentType: 'video/mp4', title: 'Video Facebook', provider: 'yt-dlp' }; }
      },
      media: { async downloadBuffer() { throw new Error('media download should not run for a buffer result'); } }
    },
    client: {},
    async sendMessage(...args) { messages.push(args); },
    async reply(message) { messages.push(['reply', message]); },
    progress: { async start() {}, async update() {}, async fail() {} },
    logger: { warn() {} }
  };
  await facebook.execute(ctx);
  assert.equal(messages.length, 1);
  assert.ok(Buffer.isBuffer(messages[0][1].video));
  assert.equal(messages[0][1].mimetype, 'video/mp4');
});

test('Facebook downloader validates supported public HTTPS hosts', () => {
  assert.equal(facebook.validateFacebookUrl('https://www.facebook.com/watch/?v=123'), 'https://www.facebook.com/watch/?v=123');
  assert.equal(facebook.validateFacebookUrl('https://fb.watch/abc123'), 'https://fb.watch/abc123');
  for (const value of ['http://facebook.com/video', 'https://example.com/video', 'https://user:pass@facebook.com/video', 'not-a-url']) {
    assert.throws(() => facebook.validateFacebookUrl(value));
  }
  assert.equal(facebook.category, 'downloader');
  assert.deepEqual(facebook.commands, ['facebook']);
  for (const plugin of [fb, fbdl, fbvideo]) assert.equal(plugin.commands.length, 1);
  assert.deepEqual([facebook, fb, fbdl, fbvideo].map(plugin => plugin.category), ['downloader', 'downloader', 'downloader', 'downloader']);
});
