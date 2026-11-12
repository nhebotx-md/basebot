'use strict';

const fs = require('node:fs');
const path = require('node:path');

const IGNORED_DIRS = new Set(['node_modules', '.git', '.cache', 'coverage']);

function findPluginFiles(root) {
  const files = [];
  const visit = directory => {
    let entries;
    try { entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)); }
    catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.endsWith('.js')) files.push(absolute);
    }
  };
  visit(root);
  return files;
}

function loadPlugins({ directory, registry, logger = console, reload = false }) {
  const root = path.resolve(directory);
  const loaded = [];
  for (const filePath of findPluginFiles(root)) {
    try {
      const resolved = require.resolve(filePath);
      if (reload) delete require.cache[resolved];
      const plugin = require(resolved);
      loaded.push(registry.register(plugin, path.relative(root, filePath)));
    } catch (error) {
      logger.error('Plugin dilewati karena gagal dimuat/validasi.', { file: path.relative(root, filePath), error: error.message });
    }
  }
  return loaded;
}

function reloadPlugins(options) {
  const { PluginRegistry } = require('./plugin-registry');
  const candidate = new PluginRegistry({ logger: options.logger });
  const failed = [];
  const capturingLogger = { ...(options.logger || console), error: (...args) => { failed.push(args); options.logger?.error?.(...args); } };
  const loaded = loadPlugins({ ...options, registry: candidate, logger: capturingLogger, reload: true });
  const fileCount = findPluginFiles(options.directory).length;
  if (failed.length || loaded.length !== fileCount) {
    (options.logger || console).warn?.('Reload plugin dibatalkan; registry aktif dipertahankan.', { loaded: loaded.length, files: fileCount, errors: failed.length });
    return options.registry.list({ includeDisabled: false });
  }
  options.registry.clear();
  for (const plugin of loaded) options.registry.register(plugin, plugin.filePath);
  return options.registry.list({ includeDisabled: false });
}

module.exports = { findPluginFiles, loadPlugins, reloadPlugins };
