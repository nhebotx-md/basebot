'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { findPluginFiles, loadPlugins } = require('../../src/core/plugins/plugin-loader');
const { PluginRegistry } = require('../../src/core/plugins/plugin-registry');

test('loader sorts recursively, ignores hidden/dependency folders, and continues after invalid plugin', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'basebot-loader-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'system', '.hidden'), { recursive: true });
  await fs.mkdir(path.join(root, 'node_modules', 'ignored'), { recursive: true });
  const valid = name => `module.exports = {name:'${name}',commands:['${name}'],category:'test',description:'desc',usage:'.${name}',permissions:{},execute:async()=>{}};`;
  await fs.writeFile(path.join(root, 'z.js'), valid('z'));
  await fs.writeFile(path.join(root, 'a.js'), valid('a'));
  await fs.writeFile(path.join(root, 'bad.js'), 'module.exports = {};');
  await fs.writeFile(path.join(root, 'system', 'child.js'), valid('child'));
  await fs.writeFile(path.join(root, 'system', '.hidden', 'hidden.js'), valid('hidden'));
  await fs.writeFile(path.join(root, 'node_modules', 'ignored', 'dep.js'), valid('dep'));
  const files = findPluginFiles(root).map(file => path.relative(root, file));
  assert.deepEqual(files, ['a.js', 'bad.js', 'system/child.js', 'z.js']);
  const errors = [];
  const registry = new PluginRegistry();
  const loaded = loadPlugins({ directory: root, registry, logger: { error(...args) { errors.push(args); }, info() {}, warn() {}, debug() {} } });
  assert.deepEqual(loaded.map(plugin => plugin.name), ['a', 'child', 'z']);
  assert.equal(errors.length, 1);
});
