'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { findPluginFiles, loadPlugins } = require('../../src/core/plugins/plugin-loader');
const { PluginRegistry } = require('../../src/core/plugins/plugin-registry');

test('loader sorts recursively, ignores hidden/dependency folders, and logs import/validation failure detail', async t => {
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
  assert.equal(errors[0][1].file, 'bad.js');
  assert.equal(errors[0][1].stage, 'metadata-validation/registration');
  assert.ok(errors[0][1].error instanceof Error);
  assert.match(errors[0][1].error.stack, /plugin-validator|plugin-registry/);
});

test('voicechanger registers all aliases even when its optional FFmpeg binary is unavailable', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'basebot-ffmpeg-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const pluginPath = require.resolve('../../plugins/media/voicechanger');
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === '@ffmpeg-installer/ffmpeg') throw Object.assign(new Error('simulated missing binary package'), { code: 'MODULE_NOT_FOUND' });
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    delete require.cache[pluginPath];
    const plugin = require(pluginPath);
    assert.equal(plugin.commands.length, 12);
    const replies = [];
    await plugin.execute({
      mime: 'audio/ogg', prefix: '.', command: 'bass', chat: 'test@s.whatsapp.net',
      config: { paths: { temp: root } },
      quoted: { async download() { return Buffer.from('audio'); } },
      m: { raw: {} },
      async reply(text) { replies.push(text); },
      async sendMessage() { throw new Error('FFmpeg should not be invoked'); }
    });
    assert.ok(replies.some(text => /npm ci/i.test(text)));
  } finally {
    Module._load = originalLoad;
    delete require.cache[pluginPath];
  }
});
