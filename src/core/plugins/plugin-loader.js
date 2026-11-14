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
    let stage = 'import';
    try {
      const resolved = require.resolve(filePath);
      if (reload) delete require.cache[resolved];
      const plugin = require(resolved);
      stage = 'metadata-validation/registration';
      loaded.push(registry.register(plugin, path.relative(root, filePath)));
    } catch (error) {
      logger.error('Plugin gagal dimuat atau divalidasi; fitur pada file ini tidak aktif.', {
        file: path.relative(root, filePath),
        stage,
        error
      });
    }
  }
  return loaded;
}

function reloadPluginsDetailed(options) {
  const { PluginRegistry } = require('./plugin-registry');
  const logger = options.logger || console;
  const fileCount = findPluginFiles(options.directory).length;
  const currentPlugins = options.registry.list();
  if (fileCount === 0) {
    logger.warn?.('Reload plugin dibatalkan; direktori plugin kosong.', { directory: options.directory });
    return { success: false, reason: 'empty-directory', loaded: 0, fileCount, plugins: currentPlugins };
  }

  const disabledNames = new Set(currentPlugins.filter(plugin => !options.registry.isEnabled(plugin.name)).map(plugin => plugin.name));
  const candidate = new PluginRegistry({ logger });
  const failed = [];
  const capturingLogger = {
    ...logger,
    error: (...args) => {
      failed.push(args);
      logger.error?.(...args);
    }
  };
  const loaded = loadPlugins({ ...options, registry: candidate, logger: capturingLogger, reload: true });
  if (failed.length || loaded.length !== fileCount) {
    logger.warn?.('Reload plugin dibatalkan; registry aktif dipertahankan.', {
      loaded: loaded.length, files: fileCount, errors: failed.length
    });
    return {
      success: false, reason: 'validation-failed', loaded: loaded.length,
      fileCount, errors: failed.length, plugins: currentPlugins
    };
  }

  options.registry.clear();
  for (const plugin of loaded) {
    const registered = options.registry.register(plugin, plugin.filePath);
    if (disabledNames.has(registered.name)) options.registry.disable(registered.name);
  }
  const plugins = options.registry.list();
  logger.info?.('Reload plugin berhasil.', {
    loaded: plugins.length,
    enabled: plugins.filter(plugin => options.registry.isEnabled(plugin.name)).length,
    disabled: plugins.filter(plugin => !options.registry.isEnabled(plugin.name)).length
  });
  return { success: true, loaded: plugins.length, fileCount, errors: 0, plugins };
}

function reloadPlugins(options) {
  const result = reloadPluginsDetailed(options);
  return result.plugins.filter(plugin => options.registry.isEnabled(plugin.name));
}

module.exports = { findPluginFiles, loadPlugins, reloadPlugins, reloadPluginsDetailed };
