'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ProviderManager } = require('../../src/core/services/provider-manager.service');

test('provider manager records successful calls', async () => {
  const manager = new ProviderManager();
  assert.equal(await manager.run('primary', async () => 'ok'), 'ok');
  assert.equal(manager.status()[0].successes, 1);
});

test('provider manager retries transient failures', async () => {
  const manager = new ProviderManager({ retries: 1 });
  let calls = 0;
  assert.equal(await manager.run('retry', async () => { if (++calls === 1) throw new Error('transient'); return 42; }), 42);
  assert.equal(calls, 2);
});

test('provider manager opens circuit after repeated failures', async () => {
  const manager = new ProviderManager({ failureThreshold: 1, cooldownMs: 30000 });
  await assert.rejects(manager.run('broken', async () => { throw new Error('down'); }));
  await assert.rejects(manager.run('broken', async () => 'unreachable'), error => error.code === 'PROVIDER_CIRCUIT_OPEN');
  assert.equal(manager.status()[0].circuit, 'open');
});

test('provider manager enforces timeout and response validation', async () => {
  const manager = new ProviderManager({ timeoutMs: 100 });
  await assert.rejects(manager.run('slow', () => new Promise(resolve => setTimeout(resolve, 250))), error => error.code === 'PROVIDER_TIMEOUT');
  await assert.rejects(manager.run('invalid', async () => ({}), { validate: value => Boolean(value.url) }), error => error.code === 'PROVIDER_INVALID_RESPONSE');
});
