'use strict';

const fs = require('node:fs');
const path = require('node:path');

const IGNORED_DIRS = new Set(['node_modules', '.git', '.cache', 'coverage']);

class PluginWatchService {
  constructor({ manager, directory, logger = console, fsApi = fs, debounceMs = 700 } = {}) {
    if (!manager || typeof manager.reload !== 'function') throw new TypeError('PluginWatchService membutuhkan PluginManager.');
    if (!directory) throw new TypeError('PluginWatchService membutuhkan direktori plugin.');
    this.manager = manager;
    this.directory = path.resolve(directory);
    this.logger = logger;
    this.fs = fsApi;
    this.debounceMs = Math.max(150, Math.min(5000, Number(debounceMs) || 700));
    this.watchers = new Map();
    this.timer = null;
    this.closed = true;
    this.running = null;
    this.reloads = 0;
    this.failures = 0;
    this.lastReloadAt = null;
  }

  directories() {
    const found = [];
    const visit = directory => {
      let entries;
      try { entries = this.fs.readdirSync(directory, { withFileTypes: true }); }
      catch { return; }
      found.push(directory);
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;
        visit(path.join(directory, entry.name));
      }
    };
    visit(this.directory);
    return found;
  }

  refresh() {
    if (this.closed) return;
    const wanted = new Set(this.directories());
    for (const [directory, watcher] of this.watchers) {
      if (wanted.has(directory)) continue;
      watcher.close();
      this.watchers.delete(directory);
    }
    for (const directory of wanted) {
      if (this.watchers.has(directory)) continue;
      try {
        const watcher = this.fs.watch(directory, (eventType, filename) => this.onChange(eventType, filename));
        watcher.on?.('error', error => this.logger.warn?.('Plugin watcher error.', { error: error.message }));
        this.watchers.set(directory, watcher);
      } catch (error) {
        this.logger.warn?.('Watcher gagal dipasang pada direktori plugin.', { error: error.message });
      }
    }
  }

  start() {
    if (!this.closed) return this.status();
    this.closed = false;
    this.refresh();
    this.logger.info?.('Auto reload plugin aktif.', { directories: this.watchers.size, debounceMs: this.debounceMs });
    return this.status();
  }

  onChange(eventType, filename) {
    if (this.closed) return;
    const name = filename == null ? '' : String(filename);
    if (name.startsWith('.') || (name && path.extname(name).toLowerCase() !== '.js' && eventType !== 'rename')) return;
    this.refresh();
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush().catch(error => this.logger.error?.('Auto reload plugin gagal.', { error }));
    }, this.debounceMs);
    this.timer.unref?.();
  }

  async flush() {
    if (this.closed) return { success: false, reason: 'watcher-stopped' };
    if (this.running) return this.running;
    this.running = Promise.resolve().then(() => this.manager.reload()).then(result => {
      this.lastReloadAt = new Date().toISOString();
      if (result?.success) {
        this.reloads += 1;
        this.logger.info?.('Plugin otomatis dimuat ulang tanpa restart.', { loaded: result.loaded });
      } else {
        this.failures += 1;
        this.logger.warn?.('Auto reload dibatalkan; registry aktif dipertahankan.', { reason: result?.reason || 'unknown' });
      }
      this.refresh();
      return result;
    }).catch(error => {
      this.failures += 1;
      this.lastReloadAt = new Date().toISOString();
      this.logger.error?.('Auto reload plugin gagal.', { error });
      return { success: false, reason: 'reload-error' };
    }).finally(() => { this.running = null; });
    return this.running;
  }

  status() {
    return {
      enabled: !this.closed,
      watchingDirectories: this.watchers.size,
      pending: Boolean(this.timer || this.running),
      reloads: this.reloads,
      failures: this.failures,
      lastReloadAt: this.lastReloadAt
    };
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    for (const watcher of this.watchers.values()) watcher.close();
    this.watchers.clear();
    this.logger.info?.('Auto reload plugin dihentikan.');
  }
}

module.exports = { PluginWatchService };
