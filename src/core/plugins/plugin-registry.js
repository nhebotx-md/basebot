'use strict';

const { validatePlugin } = require('./plugin-validator');

class PluginRegistry {
  constructor({ logger = console } = {}) {
    this.logger = logger;
    this.plugins = new Map();
    this.commands = new Map();
    this.enabled = new Set();
  }

  register(plugin, filePath = '<unknown>') {
    const validation = validatePlugin(plugin, filePath);
    if (!validation.valid) throw new Error(validation.errors.join('\n'));
    const name = plugin.name.toLowerCase();
    if (this.plugins.has(name)) throw new Error(`${filePath}: nama plugin duplikat "${plugin.name}".`);
    const conflicts = plugin.commands.map(command => command.toLowerCase()).filter(command => this.commands.has(command));
    if (conflicts.length) throw new Error(`${filePath}: command bertabrakan: ${conflicts.join(', ')}.`);
    const normalized = Object.freeze({ ...plugin, name, commands: Object.freeze(plugin.commands.map(command => command.toLowerCase())), permissions: Object.freeze({ ...(plugin.permissions || {}) }), filePath });
    this.plugins.set(name, normalized);
    this.enabled.add(name);
    for (const command of normalized.commands) this.commands.set(command, normalized);
    return normalized;
  }

  getByCommand(command) {
    const plugin = this.commands.get(String(command || '').toLowerCase());
    return plugin && this.enabled.has(plugin.name) ? plugin : undefined;
  }

  get(name) { return this.plugins.get(String(name).toLowerCase()); }
  list({ includeDisabled = true } = {}) { return [...this.plugins.values()].filter(plugin => includeDisabled || this.enabled.has(plugin.name)); }
  categories() { return [...new Set(this.list({ includeDisabled: false }).map(plugin => plugin.category))].sort(); }
  listByCategory(category) { return this.list({ includeDisabled: false }).filter(plugin => plugin.category === category); }
  enable(name) { const key = String(name).toLowerCase(); if (!this.plugins.has(key)) return false; this.enabled.add(key); return true; }
  disable(name) { return this.enabled.delete(String(name).toLowerCase()); }
  isEnabled(name) { return this.enabled.has(String(name).toLowerCase()); }
  clear() { this.plugins.clear(); this.commands.clear(); this.enabled.clear(); }
}

module.exports = { PluginRegistry };
