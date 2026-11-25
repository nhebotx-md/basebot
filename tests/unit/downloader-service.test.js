'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDownloaderService, validateSource } = require('../../src/core/services/downloader.service');
const { SOCLIP_ENDPOINT, normalizeSoclipResponse, soclipResolve } = require('../../src/integrations/providers/soclip');
const instagram = require('../../src/integrations/providers/instagram');
const imageEnhancer = require('../../src/integrations/providers/image-enhancer');
const youtube = require('../../src/integrations/providers/youtube');

test('Soclip normalizer maps video, image carousel and audio media', () => {
  const result = normalizeSoclipResponse({
    success: true, credits_used: 2, credits_remaining: 498,
    data: { source: 'tiktok', title: 'Demo', author: '@creator', medias: [
      { type: 'video', ext: 'mp4', url: 'https://cdn.example/video.mp4' },
      { type: 'image', ext: 'jpg', url: 'https://cdn.example/photo.jpg' },
      { type: 'audio', ext: 'mp3', url: 'https://cdn.example/audio.mp3' }
    ] }
  });
  assert.equal(result.medias.length, 3);
  assert.equal(result.creditsUsed, 2);
  assert.throws(() => normalizeSoclipResponse({ success: false, error: 'private post' }), /private post/);
  assert.throws(() => normalizeSoclipResponse({ success: true, data: { medias: [{ url: 'http://cdn.example/a.mp4' }] } }), /HTTPS/);
});

test('Soclip client uses Bearer authentication and the documented endpoint', async () => {
  let request;
  const result = await soclipResolve('https://www.instagram.com/reel/ABC123/', {
    apiKey: 'sc_test_key',
    post: async (url, body, options) => {
      request = { url, body, options };
      return { ok: true, status: 200, buffer: Buffer.from(JSON.stringify({
        success: true, data: { medias: [{ type: 'video', ext: 'mp4', url: 'https://cdn.example/reel.mp4' }] }
      })) };
    }
  });
  assert.equal(request.url, SOCLIP_ENDPOINT);
  assert.equal(request.body.url, 'https://www.instagram.com/reel/ABC123/');
  assert.equal(request.options.headers.authorization, 'Bearer sc_test_key');
  assert.equal(result.medias[0].type, 'video');
});

test('downloader service exposes a frozen Soclip hybrid contract and legacy image helper', () => {
  const service = createDownloaderService({}, { soclip: async () => ({ medias: [] }), igdl: async () => ({ data: [] }), ytmp3: async () => ({}) });
  assert.equal(typeof service.igdl, 'function');
  assert.equal(typeof service.tiktok, 'function');
  assert.equal(typeof service.ytmp3, 'function');
  assert.equal(service.remini, imageEnhancer.remini);
  assert.ok(Object.isFrozen(service));
});

test('source validation rejects unsupported protocols, hosts and credentials', () => {
  assert.throws(() => validateSource('http://instagram.com/reel/abc', ['instagram.com'], 'Instagram'), /HTTPS/);
  assert.throws(() => validateSource('https://instagram.com.evil.test/reel/abc', ['instagram.com'], 'Instagram'), /HTTPS/);
  assert.throws(() => validateSource('https://user:pass@tiktok.com/video', ['tiktok.com'], 'TikTok'), /kredensial/);
});

test('Instagram provider rejects non-Instagram and non-HTTPS URLs before network access', async () => {
  await assert.rejects(instagram.igdl('http://www.instagram.com/reel/example'), /tautan Instagram HTTPS/);
  await assert.rejects(instagram.igdl('https://example.com/reel/example'), /tautan Instagram HTTPS/);
});

test('YouTube provider rejects unsupported hosts and malformed video IDs before network access', async () => {
  await assert.rejects(youtube.ytmp3('https://example.com/watch?v=abcdefgh'), /bukan video YouTube/);
  await assert.rejects(youtube.ytmp3('https://youtu.be/short'), /ID YouTube tidak valid/);
});

test('Soclip is preferred for Instagram Reels and carousel posts', async () => {
  const service = createDownloaderService({ fallbackEnabled: true, soclipApiKey: 'test-key' }, {
    soclip: async () => ({ title: 'Reel', medias: [{ type: 'image', ext: 'jpg', url: 'https://cdn.example/photo.jpg' }] }),
    igdl: async () => { throw new Error('legacy should not run'); }
  });
  const result = await service.igdl('https://www.instagram.com/p/ABC123/');
  assert.equal(result.provider, 'soclip');
  assert.equal(result.data[0].type, 'image');
});

test('Instagram falls back to legacy provider when Soclip fails', async () => {
  const service = createDownloaderService({ fallbackEnabled: true }, {
    soclip: async () => { throw new Error('Soclip unavailable'); },
    ytdlpVideo: async () => { throw new Error('yt-dlp unavailable'); },
    igdl: async () => ({ data: [{ url: 'https://cdn.example/reel.mp4' }] })
  });
  const result = await service.igdl('https://www.instagram.com/reel/ABC123/');
  assert.equal(result.provider, 'legacy');
});

test('TikTok Soclip contract preserves video, slideshow images and original audio', async () => {
  const service = createDownloaderService({ fallbackEnabled: true }, {
    soclip: async () => ({ title: 'Slide post', medias: [
      { type: 'video', ext: 'mp4', url: 'https://cdn.example/video.mp4' },
      { type: 'image', ext: 'jpg', url: 'https://cdn.example/slide.jpg' },
      { type: 'audio', ext: 'mp3', url: 'https://cdn.example/audio.mp3' }
    ] }),
    tiktok: async () => { throw new Error('legacy should not run'); }
  });
  const result = await service.tiktok('https://www.tiktok.com/@creator/video/1234567890');
  assert.equal(result.videoUrl, 'https://cdn.example/video.mp4');
  assert.deepEqual(result.images, ['https://cdn.example/slide.jpg']);
  assert.equal(result.audioUrl, 'https://cdn.example/audio.mp3');
});

test('YouTube audio falls back in order to legacy converter and then yt-dlp', async () => {
  const service = createDownloaderService({ fallbackEnabled: true, ytDlpEnabled: true }, {
    soclip: async () => { throw new Error('Soclip unavailable'); },
    ytmp3: async () => { throw new Error('legacy converter unavailable'); },
    ytdlpAudio: async () => ({ buffer: Buffer.from('audio'), contentType: 'audio/mpeg', provider: 'yt-dlp' })
  });
  const result = await service.ytmp3('https://youtu.be/abcdefgh');
  assert.equal(result.provider, 'yt-dlp');
  assert.equal(result.buffer.toString(), 'audio');
});

test('provider diagnostics preserve each fallback failure instead of hiding the root cause', async () => {
  const service = createDownloaderService({ fallbackEnabled: true, ytDlpEnabled: false }, {
    soclip: async () => { throw new Error('401 invalid key'); },
    ytmp3: async () => { throw new Error('503 converter down'); }
  });
  await assert.rejects(service.ytmp3('https://youtu.be/abcdefgh'), error =>
    /Soclip: 401 invalid key/.test(error.message) && /converter YouTube cadangan: 503 converter down/.test(error.message)
  );
});

test('fallback stays enabled when config omits fallbackEnabled', async () => {
  // Regresi: sebelumnya providerChain membaca config.fallbackEnabled apa
  // adanya, jadi service yang dibuat tanpa kunci itu tidak pernah mencoba
  // provider cadangan meski Soclip down.
  const service = createDownloaderService({}, {
    soclip: async () => { throw new Error('Soclip unavailable'); },
    ytdlpVideo: async () => { throw new Error('yt-dlp unavailable'); },
    igdl: async () => ({ data: [{ url: 'https://cdn.example/reel.mp4' }] })
  });
  const result = await service.igdl('https://www.instagram.com/reel/ABC123/');
  assert.equal(result.provider, 'legacy');
});

test('Instagram falls back to yt-dlp video when Soclip fails', async () => {
  const service = createDownloaderService({ fallbackEnabled: true }, {
    soclip: async () => { throw new Error('Soclip unavailable'); },
    ytdlpVideo: async () => ({ buffer: Buffer.from('video'), contentType: 'video/mp4', title: 'Media Instagram', provider: 'yt-dlp' }),
    igdl: async () => { throw new Error('legacy should not run'); }
  });
  const result = await service.igdl('https://www.instagram.com/reel/ABC123/');
  assert.equal(result.provider, 'yt-dlp');
  assert.equal(result.buffer.toString(), 'video');
});

test('Facebook downloader prefers Soclip and falls back to yt-dlp video', async () => {
  const viaSoclip = createDownloaderService({ fallbackEnabled: true }, {
    soclip: async () => ({ title: 'FB post', medias: [{ type: 'video', ext: 'mp4', url: 'https://cdn.example/fb.mp4' }] })
  });
  const soclipResult = await viaSoclip.facebook('https://www.facebook.com/watch/?v=123');
  assert.equal(soclipResult.provider, 'soclip');
  assert.equal(soclipResult.data[0].url, 'https://cdn.example/fb.mp4');

  const viaYtDlp = createDownloaderService({ fallbackEnabled: true }, {
    soclip: async () => { throw new Error('Soclip unavailable'); },
    ytdlpVideo: async () => ({ buffer: Buffer.from('video'), contentType: 'video/mp4', title: 'Video Facebook', provider: 'yt-dlp' })
  });
  const fallbackResult = await viaYtDlp.facebook('https://fb.watch/abc123');
  assert.equal(fallbackResult.provider, 'yt-dlp');
  assert.equal(fallbackResult.buffer.toString(), 'video');
});

test('Facebook downloader rejects non-Facebook hosts before any provider call', async () => {
  const service = createDownloaderService({}, {
    soclip: async () => { throw new Error('soclip should not run'); }
  });
  await assert.rejects(service.facebook('https://example.com/watch/?v=123'), /Facebook/);
  await assert.rejects(service.facebook('http://www.facebook.com/watch/?v=123'), /HTTPS/);
});

test('legacy downloader helper paths preserve their public exports', () => {
  assert.equal(require('../../start/lib/function/igdl').igdl, instagram.igdl);
  assert.equal(require('../../start/lib/function/remini').remini, imageEnhancer.remini);
  assert.equal(require('../../start/lib/function/ytmp3').ytmp3, youtube.ytmp3);
});
