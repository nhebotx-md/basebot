'use strict';

class PluginStateRepository {
  constructor({ database } = {}) {
    if (!database) throw new TypeError('PluginStateRepository membutuhkan DatabaseService.');
    this.database = database;
  }

  async getDisabledPlugins() {
    const state = this.database.read('plugins');
    return Array.isArray(state.disabled) ? state.disabled.map(name => String(name).toLowerCase()) : [];
  }

  async setEnabled(name, enabled) {
    const key = String(name || '').trim().toLowerCase();
    if (!key) throw new TypeError('Nama plugin wajib diisi.');
    await this.database.update('plugins', state => {
      const disabled = new Set(Array.isArray(state.disabled) ? state.disabled.map(item => String(item).toLowerCase()) : []);
      if (enabled) disabled.delete(key);
      else disabled.add(key);
      state.disabled = [...disabled].sort();
      return state;
    });
    return { name: key, enabled: Boolean(enabled) };
  }
}

module.exports = { PluginStateRepository };