'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { versionAtLeast, SystemDoctorService } = require('../../src/core/services/system-doctor.service');

test('Node version comparison handles patch and minor boundaries', () => {
  assert.equal(versionAtLeast('v22.13.0', '22.13.0'), true);
  assert.equal(versionAtLeast('v24.0.0', '22.13.0'), true);
  assert.equal(versionAtLeast('v22.12.9', '22.13.0'), false);
});

test('doctor produces structured checks and never exposes credentials', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-md-doctor-'));
  for (const name of ['session', 'temp', 'logs', 'database']) fs.mkdirSync(path.join(root, name));
  fs.writeFileSync(path.join(root, 'settings.example.js'), 'module.exports = {};');
  const service = new SystemDoctorService({
    config: { paths: { session: 'session', temp: 'temp', logs: 'logs', database: 'database' } },
    database: { status: () => ({ initialized: true, closed: false }) },
    connection: { status: { state: 'open' } },
    pluginManager: { stats: () => ({ total: 1, enabled: 1 }) },
    cwd: root, nodeVersion: 'v24.0.0'
  });
  const report = await service.run();
  assert.ok(report.checks.some(item => item.name === 'Database' && item.status === 'pass'));
  assert.ok(report.checks.some(item => item.name === 'Konfigurasi' && item.status === 'warn'));
  assert.equal(JSON.stringify(report).includes('SOCLIP_API_KEY'), false);
  fs.rmSync(root, { recursive: true, force: true });
});
