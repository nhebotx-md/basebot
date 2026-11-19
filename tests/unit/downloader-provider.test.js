'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createDownloaderService } = require('../../src/core/services/downloader.service');

test('downloader uses shared provider manager and falls back after primary provider failure', async () => {
  let primaryCalls = 0, fallbackCalls = 0;
  const service = createDownloaderService({ fallbackEnabled: true, providerFailureThreshold: 3 }, {
    soclip: async () => { primaryCalls += 1; throw new Error('primary unavailable'); },
    igdl: async () => { fallbackCalls += 1; return { data: [{ url: 'https://cdn.example/media.jpg' }] }; }
  });
  const result = await service.igdl('https://www.instagram.com/p/example/');
  assert.equal(result.provider, 'legacy');
  assert.equal(primaryCalls, 1);
  assert.equal(fallbackCalls, 1);
  const status = service.providerStatus();
  assert.equal(status.find(item => item.name === 'Soclip').failures, 1);
  assert.equal(status.find(item => item.name === 'provider Instagram cadangan').successes, 1);
});

test('downloader respects fallbackEnabled=false', async () => {
  let fallbackCalls = 0;
  const service = createDownloaderService({ fallbackEnabled: false }, {
    soclip: async () => { throw new Error('primary unavailable'); },
    igdl: async () => { fallbackCalls += 1; return { data: [{ url: 'https://cdn.example/media.jpg' }] }; }
  });
  await assert.rejects(service.igdl('https://www.instagram.com/p/example/'), /Instagram downloader gagal/);
  assert.equal(fallbackCalls, 0);
});
