'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../../plugins/downloader/download-tiktok.handler.cjs');
const { createDownloaderService } = require('../../src/core/services/downloader.service');

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
  const service = createDownloaderService({ fallbackEnabled: true }, {
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
