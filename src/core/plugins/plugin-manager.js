'use strict';

const { reloadPluginsDetailed } = require('./plugin-loader');

class PluginManager {
  constructor({ registry, directory, logger = console } = {}) {
    if (!registry || typeof registry.list !== 'function') throw new TypeError('PluginManager membutuhkan PluginRegistry.');
    if (!directory) throw new TypeError('PluginManager membutuhkan direktori plugin.');
    this.registry = registry;
    this.directory = directory;
    this.logger = logger;
  }

  list() {
    return this.registry.list().map(plugin => ({
      name: plugin.name,
      category: plugin.category,
      description: plugin.description,
      commands: [...plugin.commands],
      enabled: this.registry.isEnabled(plugin.name),
      filePath: plugin.filePath
    })).sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }

  info(name) {
    const plugin = this.registry.get(name);
    if (!plugin) return null;
    return {
      name: plugin.name,
      category: plugin.category,
      description: plugin.description,
      usage: plugin.usage,
      commands: [...plugin.commands],
      enabled: this.registry.isEnabled(plugin.name),
      filePath: plugin.filePath
    };
  }

  enable(name) {
    const plugin = this.registry.get(name);
    if (!plugin) return { success: false, reason: 'not-found' };
    const changed = !this.registry.isEnabled(plugin.name);
    this.registry.enable(plugin.name);
    this.logger.info?.('Plugin diaktifkan oleh owner.', { plugin: plugin.name, changed });
    return { success: true, changed, plugin: plugin.name };
  }

  disable(name) {
    const key = String(name || '').trim().toLowerCase();
    if (key === 'plugin-manager') return { success: false, reason: 'protected' };
    const plugin = this.registry.get(key);
    if (!plugin) return { success: false, reason: 'not-found' };
    const changed = this.registry.isEnabled(plugin.name);
    this.registry.disable(plugin.name);
    this.logger.info?.('Plugin dinonaktifkan oleh owner.', { plugin: plugin.name, changed });
    return { success: true, changed, plugin: plugin.name };
  }

  reload() {
    return reloadPluginsDetailed({
      directory: this.directory,
      registry: this.registry,
      logger: this.logger
    });
  }

  stats() {
    const plugins = this.registry.list();
    const enabled = plugins.filter(plugin => this.registry.isEnabled(plugin.name));
    const commands = enabled.reduce((total, plugin) => total + plugin.commands.length, 0);
    return {
      total: plugins.length,
      enabled: enabled.length,
      disabled: plugins.length - enabled.length,
      commands,
      categories: new Set(plugins.map(plugin => plugin.category)).size
    };
  }
}

module.exports = { PluginManager };
