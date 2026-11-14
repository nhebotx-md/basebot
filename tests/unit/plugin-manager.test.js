'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { PluginRegistry } = require('../../src/core/plugins/plugin-registry');
const { loadPlugins } = require('../../src/core/plugins/plugin-loader');
const { PluginManager } = require('../../src/core/plugins/plugin-manager');

const logger = { info() {}, warn() {}, error() {}, debug() {} };

function source(name, command) {
  return [
    "'use strict';",
    'module.exports = {',
    "  name: '" + name + "',",
    "  commands: ['" + command + "'],",
    "  category: 'test',",
    "  description: 'Plugin test',",
    "  usage: '." + command + "',",
    '  permissions: {},',
    '  async execute() {}',
    '};'
  ].join('\n');
}

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'basebot-plugin-manager-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, 'alpha.js'), source('alpha', 'alpha'));
  await fs.writeFile(path.join(directory, 'plugin-manager.js'), source('plugin-manager', 'plugin'));
  const registry = new PluginRegistry({ logger });
  loadPlugins({ directory, registry, logger });
  return { directory, registry, manager: new PluginManager({ registry, directory, logger }) };
}

test('plugin manager lists, inspects, enables and disables plugins safely', async t => {
  const { registry, manager } = await fixture(t);
  assert.equal(manager.list().length, 2);
  assert.equal(manager.info('alpha').enabled, true);
  assert.equal(manager.disable('alpha').success, true);
  assert.equal(registry.getByCommand('alpha'), undefined);
  assert.equal(manager.info('alpha').enabled, false);
  assert.equal(manager.enable('alpha').success, true);
  assert.ok(registry.getByCommand('alpha'));
  assert.deepEqual(manager.disable('missing'), { success: false, reason: 'not-found' });
  assert.deepEqual(manager.disable('plugin-manager'), { success: false, reason: 'protected' });
});

test('reload stages plugins, adds new files and preserves disabled states', async t => {
  const { directory, registry, manager } = await fixture(t);
  manager.disable('alpha');
  await fs.writeFile(path.join(directory, 'beta.js'), source('beta', 'beta'));
  const result = manager.reload();
  assert.equal(result.success, true);
  assert.equal(result.loaded, 3);
  assert.equal(registry.isEnabled('alpha'), false);
  assert.equal(registry.getByCommand('alpha'), undefined);
  assert.equal(registry.isEnabled('beta'), true);
  assert.ok(registry.getByCommand('beta'));
  assert.ok(registry.getByCommand('plugin'));
});

test('failed or empty reload never destroys the live registry', async t => {
  const { directory, registry, manager } = await fixture(t);
  manager.disable('alpha');
  await fs.writeFile(path.join(directory, 'invalid.js'), 'module.exports = {};');
  const failed = manager.reload();
  assert.equal(failed.success, false);
  assert.equal(registry.get('alpha')?.name, 'alpha');
  assert.equal(registry.isEnabled('alpha'), false);
  assert.ok(registry.getByCommand('plugin'));

  await fs.rm(path.join(directory, 'alpha.js'));
  await fs.rm(path.join(directory, 'plugin-manager.js'));
  await fs.rm(path.join(directory, 'invalid.js'));
  const empty = manager.reload();
  assert.equal(empty.success, false);
  assert.equal(empty.reason, 'empty-directory');
  assert.equal(registry.get('alpha')?.name, 'alpha');
});


test('owner plugin command delegates list and state changes to the runtime manager', async () => {
  const command = require('../../plugins/owner/plugin-manager');
  const replies = [];
  const calls = [];
  const manager = {
    list() { return [{ name: 'alpha', category: 'utility', enabled: true, commands: ['alpha'] }]; },
    info() { return null; },
    enable(name) { calls.push(['enable', name]); return { success: true, changed: true, plugin: name }; },
    disable(name) { calls.push(['disable', name]); return { success: true, changed: true, plugin: name }; },
    reload() { calls.push(['reload']); return { success: true, loaded: 2 }; },
    stats() { return { total: 2, enabled: 2, disabled: 0, commands: 3, categories: 2 }; }
  };
  const ctx = {
    isOwner: true, isNewsletter: false, isChannel: false, prefix: '.',
    services: { pluginManager: manager },
    async reply(message) { replies.push(message); }
  };

  await command.execute({ ...ctx, args: ['list'] });
  assert.match(replies.pop(), /alpha/);
  await command.execute({ ...ctx, args: ['disable', 'alpha'] });
  assert.deepEqual(calls.pop(), ['disable', 'alpha']);
  assert.match(replies.pop(), /dinonaktifkan/);
  await command.execute({ ...ctx, args: ['reload', 'all'] });
  assert.deepEqual(calls.pop(), ['reload']);
  assert.match(replies.pop(), /2 plugin dimuat ulang/);
});

test('owner plugin command rejects channel/newsletter context even when metadata says owner', async () => {
  const command = require('../../plugins/owner/plugin-manager');
  const replies = [];
  await command.execute({
    isOwner: true, isNewsletter: true, isChannel: true, args: ['list'],
    services: { pluginManager: { list() { throw new Error('must not run'); } } },
    async reply(message) { replies.push(message); }
  });
  assert.match(replies[0], /hanya dapat dijalankan/);
});

test('owner plugin command has a second owner check and handles missing runtime service', async () => {
  const command = require('../../plugins/owner/plugin-manager');
  const replies = [];
  const base = { isNewsletter: false, isChannel: false, args: ['list'], async reply(message) { replies.push(message); } };
  await command.execute({ ...base, isOwner: false, services: { pluginManager: {} } });
  assert.match(replies.pop(), /khusus owner/);
  await command.execute({ ...base, isOwner: true, services: {} });
  assert.match(replies.pop(), /belum tersedia/);
});
