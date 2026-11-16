'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const healthPlugin = require('../../plugins/owner/health');

function context(overrides = {}) {
  const replies = [];
  return {
    ctx: {
      isOwner: true, isNewsletter: false, isChannel: false, args: [], prefix: '.',
      services: { health: { getReport: () => ({
        status: 'healthy', uptimeSeconds: 90,
        whatsapp: { state: 'open', connected: true, reconnectAttempts: 0, lastConnectedAt: null },
        database: { ready: true, schemaVersion: 1, collections: ['users', 'groups', 'plugins'], pendingWrites: 0 },
        plugins: { total: 4, enabled: 4, disabled: 0, commands: 8, categories: 3, skippedAtStartup: 0, discoveredAtStartup: 4, loadedAtStartup: 4 },
        memory: { rssMb: 20, heapUsedMb: 5, heapTotalMb: 10, heapUsagePercent: 50, externalMb: 1, arrayBuffersMb: 0 },
        runtime: { node: 'v22.13.0', platform: 'linux', arch: 'x64', pid: 1, processUptimeSeconds: 100, loadAverage: [0, 0, 0] },
        eventLoopDelay: { p95Ms: 1, maxMs: 2 },
        checks: [{ name: 'Database', status: 'healthy', detail: 'ready' }]
      }) } },
      async reply(message) { replies.push(message); }, ...overrides
    },
    replies
  };
}

test('health command returns a concise status summary to the owner', async () => {
  const { ctx, replies } = context();
  await healthPlugin.execute(ctx);
  assert.match(replies[0], /BASEBOT HEALTH/);
  assert.match(replies[0], /HEALTHY/);
  assert.match(replies[0], /WhatsApp: open/);
});

test('health command supports detail, plugins and memory views', async () => {
  for (const [argument, expected] of [['detail', 'Event loop'], ['plugins', 'PLUGIN HEALTH'], ['memory', 'MEMORY HEALTH']]) {
    const { ctx, replies } = context({ args: [argument] });
    await healthPlugin.execute(ctx);
    assert.match(replies[0], new RegExp(expected));
  }
});

test('health command refuses non-owner, channel and missing service contexts', async () => {
  let item = context({ isOwner: false });
  await healthPlugin.execute(item.ctx);
  assert.match(item.replies[0], /khusus owner/);
  item = context({ isNewsletter: true });
  await healthPlugin.execute(item.ctx);
  assert.match(item.replies[0], /hanya dapat dijalankan/);
  item = context({ services: {} });
  await healthPlugin.execute(item.ctx);
  assert.match(item.replies[0], /belum tersedia/);
});
