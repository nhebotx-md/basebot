'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { HealthService } = require('../../src/core/services/health.service');

function fixture(overrides = {}) {
  let enabled = false, disabled = false;
  const histogram = { max: 8e6, enable() { enabled = true; }, disable() { disabled = true; }, percentile(value) { return value === 95 ? 5e6 : 2e6; } };
  const service = new HealthService({
    registry: { list: () => [], isEnabled: () => false },
    connection: { status: { state: 'open', reconnectAttempts: 0, lastConnectedAt: 1000 }, client: {} },
    database: { status: () => ({ initialized: true, schemaVersion: 1, collections: ['users', 'groups', 'plugins'] }), pendingWrites: 2 },
    pluginManager: { stats: () => ({ total: 4, enabled: 3, disabled: 1, commands: 8, categories: 3 }) },
    startupStats: { discovered: 4, loaded: 4, skipped: 0 }, startedAt: 1000, clock: () => 61000,
    processInfo: { version: 'v22.13.0', platform: 'linux', arch: 'x64', pid: 42, uptime: () => 120, memoryUsage: () => ({ rss: 10 * 1048576, heapUsed: 4 * 1048576, heapTotal: 8 * 1048576, external: 1048576, arrayBuffers: 0 }) },
    osInfo: { loadavg: () => [0.1, 0.2, 0.3] }, eventLoopMonitor: () => histogram, ...overrides
  });
  return { service, histogramState: () => ({ enabled, disabled }) };
}

test('health report aggregates healthy runtime, connection, database, plugins and resources', () => {
  const { service, histogramState } = fixture();
  const report = service.getReport();
  assert.equal(report.status, 'healthy');
  assert.equal(report.uptimeSeconds, 60);
  assert.equal(report.whatsapp.connected, true);
  assert.equal(report.database.ready, true);
  assert.equal(report.database.pendingWrites, 2);
  assert.equal(report.plugins.commands, 8);
  assert.equal(report.memory.rssMb, 10);
  assert.equal(report.eventLoopDelay.p95Ms, 5);
  assert.deepEqual(report.checks.map(item => item.status), ['healthy', 'healthy', 'healthy']);
  assert.equal(histogramState().enabled, true);
  service.stop();
  assert.equal(histogramState().disabled, true);
});

test('health report degrades when WhatsApp is offline or plugin startup skipped files', () => {
  const { service } = fixture({ connection: { status: { state: 'reconnecting', reconnectAttempts: 3 }, client: null }, startupStats: { discovered: 5, loaded: 4, skipped: 1 } });
  const report = service.getReport();
  assert.equal(report.status, 'degraded');
  assert.equal(report.whatsapp.connected, false);
  assert.equal(report.whatsapp.reconnectAttempts, 3);
  assert.equal(report.plugins.skippedAtStartup, 1);
  service.stop();
});

test('health report becomes critical when database is not initialized or already closed', () => {
  const { service } = fixture({ database: { closed: true, status: () => ({ initialized: true, schemaVersion: 1, collections: [] }) } });
  assert.equal(service.getReport().status, 'critical');
  service.stop();
});

test('health monitor stop is idempotent', () => {
  const { service, histogramState } = fixture();
  service.stop(); service.stop();
  assert.equal(histogramState().disabled, true);
});
