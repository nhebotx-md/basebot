'use strict';

const { validatePermission } = require('../security/permission-manager');

class CommandDispatcher {
  constructor({ registry, logger = console, dedupeTtlMs = 10 * 60 * 1000, maxDedupeEntries = 5000, rateLimit = 8, rateWindowMs = 10000, maxConcurrentCommands = 20 }) {
    this.registry = registry;
    this.logger = logger;
    this.dedupeTtlMs = dedupeTtlMs;
    this.maxDedupeEntries = maxDedupeEntries;
    this.rateLimit = rateLimit;
    this.rateWindowMs = rateWindowMs;
    this.maxConcurrentCommands = maxConcurrentCommands;
    this.activeCommands = 0;
    this.seen = new Map();
    this.rateEvents = new Map();
    this.rateWarnings = new Map();
  }

  prune(now = Date.now()) {
    for (const [id, timestamp] of this.seen) {
      if (now - timestamp < this.dedupeTtlMs && this.seen.size <= this.maxDedupeEntries) break;
      this.seen.delete(id);
    }
    for (const [sender, timestamps] of this.rateEvents) {
      const recent = timestamps.filter(timestamp => now - timestamp < this.rateWindowMs);
      if (recent.length) this.rateEvents.set(sender, recent);
      else this.rateEvents.delete(sender);
    }
  }

  allowRate(ctx, now = Date.now()) {
    if (!this.rateLimit) return true;
    const key = ctx.sender || ctx.chat || 'unknown';
    const recent = (this.rateEvents.get(key) || []).filter(timestamp => now - timestamp < this.rateWindowMs);
    if (recent.length >= this.rateLimit) {
      this.rateEvents.set(key, recent);
      return false;
    }
    recent.push(now);
    this.rateEvents.set(key, recent);
    return true;
  }

  async dispatch(ctx) {
    const id = ctx.m?.id;
    if (id) {
      this.prune();
      if (this.seen.has(id)) return { handled: false, reason: 'duplicate' };
      this.seen.set(id, Date.now());
    }
    if (!ctx.command) return { handled: false, reason: 'not-command' };
    const plugin = this.registry.getByCommand(ctx.command);
    if (!plugin) return { handled: false, reason: 'unknown-command' };
    if (!this.allowRate(ctx)) {
      const key = ctx.sender || ctx.chat || 'unknown';
      if (!this.rateWarnings.has(key)) { this.rateWarnings.set(key, Date.now()); await ctx.reply('Terlalu banyak command. Tunggu sebentar lalu coba lagi.'); }
      return { handled: true, plugin: plugin.name, reason: 'rate-limit' };
    }
    const permission = validatePermission(plugin, ctx);
    if (!permission.allowed) {
      const messages = { owner: 'Fitur ini khusus owner.', group: 'Command ini hanya dapat digunakan di grup.', private: 'Command ini hanya dapat digunakan di chat pribadi.', admin: 'Hanya admin grup yang dapat menggunakan command ini.', 'bot-admin': 'Bot harus menjadi admin grup untuk menjalankan command ini.', restricted: 'Bot sedang dalam mode self.' };
      await ctx.reply(messages[permission.reason] || 'Akses ditolak.');
      return { handled: true, plugin: plugin.name, reason: permission.reason };
    }
    if (this.activeCommands >= this.maxConcurrentCommands) {
      await ctx.reply('Bot sedang sibuk. Coba lagi sebentar.');
      return { handled: true, plugin: plugin.name, reason: 'busy' };
    }
    this.activeCommands += 1;
    const startedAt = Date.now();
    try {
      await plugin.execute(ctx);
      const activity = { plugin: plugin.name, command: ctx.command, category: plugin.category, scope: ctx.isGroup ? 'group' : 'private', durationMs: Date.now() - startedAt };
      if (typeof this.logger.activity === 'function') this.logger.activity(activity);
      else this.logger.info('Plugin berhasil dijalankan.', { plugin: plugin.name, command: ctx.command });
      return { handled: true, plugin: plugin.name };
    } catch (error) {
      this.logger.error('Plugin gagal saat dieksekusi.', { plugin: plugin.name, command: ctx.command, error });
      try { await ctx.reply('Terjadi kesalahan saat menjalankan fitur. Silakan coba lagi.'); }
      catch (replyError) { this.logger.warn('Gagal mengirim pesan error plugin.', { plugin: plugin.name, error: replyError.message }); }
      return { handled: true, plugin: plugin.name, error };
    } finally {
      this.activeCommands -= 1;
    }
  }

  async dispatchEvent(eventName, ctx, event) {
    const results = [];
    for (const plugin of this.registry.list({ includeDisabled: false })) {
      if (!plugin.events?.includes(eventName)) continue;
      if (this.activeCommands >= this.maxConcurrentCommands) { results.push({ plugin: plugin.name, ok: false, reason: 'busy' }); continue; }
      this.activeCommands += 1;
      try { await plugin.onEvent(ctx, event); results.push({ plugin: plugin.name, ok: true }); }
      catch (error) { this.logger.error('Plugin event gagal.', { plugin: plugin.name, eventName, error }); results.push({ plugin: plugin.name, ok: false }); }
      finally { this.activeCommands -= 1; }
    }
    return results;
  }
}

module.exports = { CommandDispatcher };
