'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../../plugins/downloader/download-tiktok.handler.cjs');
const { createDownloaderService } = require('../../src/core/services/downloader.service');
const { resolveMediaType } = handler;
const tiktokPlugin = require('../../plugins/downloader/tiktok');
const ttPlugin = require('../../plugins/downloader/tt');

test('TikTok input parser recognizes media choices before or after the URL', () => {
  assert.deepEqual(handler.parseTikTokInput('https://vt.tiktok.com/abc video'), {
    url: 'https://vt.tiktok.com/abc', mode: 'video'
  });
  assert.deepEqual(handler.parseTikTokInput('audio https://www.tiktok.com/@user/video/123'), {
    url: 'https://www.tiktok.com/@user/video/123', mode: 'audio'
  });
  assert.deepEqual(handler.parseTikTokInput('https://www.tiktok.com/@user/photo/123 slideshow'), {
    url: 'https://www.tiktok.com/@user/photo/123', mode: 'slide'
  });
  assert.deepEqual(handler.parseTikTokInput('https://www.tiktok.com/@user/video/123'), {
    url: 'https://www.tiktok.com/@user/video/123', mode: ''
  });
});

test('TikTok downloader falls back when the first provider lacks the selected media type', async () => {
  const calls = [];
  const service = createDownloaderService({ fallbackEnabled: false }, {
    tikwm: async () => {
      calls.push('tikwm');
      return { title: 'TikTok', videoUrl: 'https://cdn.example/video.mp4', images: [], audioUrl: '' };
    },
    soclip: async () => {
      calls.push('soclip');
      return {
        title: 'TikTok photo post',
        medias: [{ url: 'https://cdn.example/photo.jpg', type: 'image', ext: 'jpg' }]
      };
    },
    providerManager: {
      async run(name, fn) { return fn(); },
      status() { return {}; }
    }
  });

  const result = await service.tiktok('https://www.tiktok.com/@user/photo/123', { mode: 'slide' });
  assert.deepEqual(calls, ['tikwm', 'soclip']);
  assert.deepEqual(result.images, ['https://cdn.example/photo.jpg']);
  assert.equal(result.videoUrl, '');
});

test('TikTok downloader rejects unsupported media modes', async () => {
  const service = createDownloaderService({}, {
    providerManager: { async run(name, fn) { return fn(); }, status() { return {}; } },
    tikwm: async () => ({ videoUrl: 'https://cdn.example/video.mp4' })
  });
  await assert.rejects(
    service.tiktok('https://www.tiktok.com/@user/video/123', { mode: 'document' }),
    /Jenis media TikTok tidak didukung/
  );
});

test('TikTok media type detection accepts binary CDN responses with recognizable signatures', () => {
  const mp4 = Buffer.alloc(16);
  mp4.write('ftyp', 4, 'ascii');
  mp4.write('isom', 8, 'ascii');
  assert.equal(resolveMediaType('application/octet-stream', mp4, 'video'), 'video/mp4');

  const mp3 = Buffer.from('ID3\u0004\u0000\u0000\u0000\u0000\u0000\u0000');
  assert.equal(resolveMediaType('application/octet-stream', mp3, 'audio'), 'audio/mpeg');

  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
  assert.equal(resolveMediaType('application/octet-stream', jpeg, 'image'), 'image/jpeg');
});

test('TikTok media type detection rejects unrelated HTML error pages', () => {
  const html = Buffer.from('<html>blocked</html>');
  assert.equal(resolveMediaType('text/html', html, 'video'), '');
  assert.equal(resolveMediaType('application/octet-stream', html, 'audio'), '');
});

test('TikTok plugin registers both .tiktok and .tt command aliases', () => {
  assert.deepEqual(tiktokPlugin.commands, ['tiktok']);
  assert.deepEqual(ttPlugin.commands, ['tt']);
});
