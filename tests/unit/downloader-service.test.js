'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDownloaderService } = require('../../src/core/services/downloader.service');
const instagram = require('../../src/integrations/providers/instagram');
const imageEnhancer = require('../../src/integrations/providers/image-enhancer');
const youtube = require('../../src/integrations/providers/youtube');

test('downloader service exposes provider operations through one stable service contract', () => {
  const service = createDownloaderService();
  assert.equal(service.igdl, instagram.igdl);
  assert.equal(service.remini, imageEnhancer.remini);
  assert.equal(service.ytmp3, youtube.ytmp3);
  assert.ok(Object.isFrozen(service));
});

test('Instagram provider rejects non-Instagram and non-HTTPS URLs before network access', async () => {
  await assert.rejects(instagram.igdl('http://www.instagram.com/reel/example'), /tautan Instagram HTTPS/);
  await assert.rejects(instagram.igdl('https://example.com/reel/example'), /tautan Instagram HTTPS/);
});

test('image enhancer validates input size and type before network access', async () => {
  await assert.rejects(imageEnhancer.remini(null), /Buffer maksimal 10 MB/);
  await assert.rejects(imageEnhancer.remini(Buffer.alloc(0)), /Buffer maksimal 10 MB/);
});

test('YouTube provider rejects unsupported hosts and malformed video IDs before network access', async () => {
  await assert.rejects(youtube.ytmp3('https://example.com/watch?v=abcdefgh'), /bukan video YouTube/);
  await assert.rejects(youtube.ytmp3('https://youtu.be/short'), /ID YouTube tidak valid/);
});

test('legacy downloader helper paths preserve their public exports', () => {
  assert.equal(require('../../start/lib/function/igdl').igdl, instagram.igdl);
  assert.equal(require('../../start/lib/function/remini').remini, imageEnhancer.remini);
  assert.equal(require('../../start/lib/function/ytmp3').ytmp3, youtube.ytmp3);
});
