'use strict';

const { randomBytes } = require('node:crypto');
const { validatePermission } = require('../security/permission-manager');

function safeErrorDetail(error) {
  const raw = String(error?.message || error || 'Tidak ada detail tambahan.');
  return raw
    .replace(/https?:\/\/\S+/gi, '[URL disamarkan]')
    .replace(/(?:[A-Z]:\\|\/)(?:[^\s:]+\/)*[^\s:]*/gi, '[path disamarkan]')
    .replace(/\b(token|api[_-]?key|password|secret|authorization)\s*[:=]\s*\S+/gi, '$1=[disamarkan]')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 180) || 'Tidak ada detail tambahan.';
}

function diagnosePluginError(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  const status = Number(error?.statusCode || error?.status || 0);
  if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED'].includes(code) || /network|fetch failed|timed? ?out|socket hang up/.test(message)) {
    return { cause: 'Layanan eksternal atau koneksi internet tidak merespons.', action: 'Periksa koneksi internet dan status API penyedia, lalu ulangi beberapa saat lagi.' };
  }
  if (status >= 400 || /http \d{3}/.test(message)) {
    return { cause: 'Server/API tujuan menolak permintaan atau sedang mengalami gangguan.', action: 'Periksa endpoint, API key dan kuota layanan pada konfigurasi bot. Jangan kirim kredensial ke chat.' };
  }
  if (['ENOENT', 'EACCES', 'EPERM', 'ENOSPC'].includes(code)) {
    return { cause: 'File atau direktori yang dibutuhkan tidak tersedia atau tidak dapat diakses.', action: 'Periksa lokasi file, izin akses direktori, dan ruang penyimpanan server.' };
  }
  if (error instanceof SyntaxError || error instanceof TypeError || error instanceof ReferenceError || /is not a function|is not defined|unexpected token/.test(message)) {
    return { cause: 'Ada kemungkinan bug pada kode plugin, data yang diterima tidak sesuai, atau dependensi tidak cocok.', action: 'Periksa stack trace pada log server dan validasi input serta dependensi plugin.' };
  }
  return { cause: 'Proses plugin berhenti karena exception yang tidak tertangani.', action: 'Periksa log server menggunakan ID referensi di bawah, lalu perbaiki bagian plugin yang disebutkan.' };
}

function formatPluginFailure({ plugin, command, error, stage = 'execute', reference }) {
  const diagnosis = diagnosePluginError(error);
  const errorName = String(error?.name || 'Error').replace(/[^a-z0-9_.-]/gi, '').slice(0, 32) || 'Error';
  return [
    '╭━━━━━━━━〔 ⚠ FITUR GAGAL DIPROSES 〕',
    '│ PLUGIN   : *' + String(plugin || 'unknown').slice(0, 64) + '*',
    '│ COMMAND  : *' + String(command || '-').slice(0, 40) + '*',
    '│ TAHAP    : *' + stage + '*',
    '│ REF      : *' + reference + '*',
    '┣━━━━━━━━━━━━━━━━━━━━━━━━',
    '│ STATUS   : Terjadi kesalahan; proses tidak berhasil diselesaikan.',
    '│ ERROR    : *' + errorName + '*',
    '│ DETAIL   : ' + safeErrorDetail(error),
    '┣━━━━━━━━━━━━━━━━━━━━━━━━',
    '│ KEMUNGKINAN PENYEBAB',
    '│ ' + diagnosis.cause,
    '│',
    '│ LANGKAH PERBAIKAN',
    '│ ' + diagnosis.action,
    '│',
    '│ Jika masalah berulang, kirim REF kepada owner agar',
    '│ log teknis yang sesuai dapat diperiksa.',
    '╰━━━━━━━━━━━━━━━━━━━━━━━━'
  ].join('\n');
}

class CommandDispatcher {
  constructor({ registry, logger = console, menuService = null, dedupeTtlMs = 10 * 60 * 1000, maxDedupeEntries = 5000, rateLimit = 8, rateWindowMs = 10000, rateWarningTtlMs = rateWindowMs, maxRateWarningEntries = 1000, maxConcurrentCommands = 20 }) {
    this.registry = registry;
    this.logger = logger;
    this.menuService = menuService;
    this.dedupeTtlMs = dedupeTtlMs;
    this.maxDedupeEntries = maxDedupeEntries;
    this.rateLimit = rateLimit;
    this.rateWindowMs = rateWindowMs;
    this.rateWarningTtlMs = rateWarningTtlMs;
    this.maxRateWarningEntries = maxRateWarningEntries;
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
    while (this.rateEvents.size > this.maxDedupeEntries) this.rateEvents.delete(this.rateEvents.keys().next().value);
    for (const [sender, timestamp] of this.rateWarnings) {
      if (now - timestamp >= this.rateWarningTtlMs) this.rateWarnings.delete(sender);
    }
    while (this.rateWarnings.size > this.maxRateWarningEntries) this.rateWarnings.delete(this.rateWarnings.keys().next().value);
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

  async recordCommand(ctx) {
    if (!ctx.sender || !ctx.services?.users) return;
    try { await ctx.services.users.recordCommand(ctx.sender, ctx.pushname); }
    catch (error) { this.logger.warn?.('Statistik command gagal disimpan.', { command: ctx.command, error: error.message }); }
  }

  async dispatch(ctx) {
    this.prune();
    const id = ctx.m?.id;
    if (id) {
      if (this.seen.has(id)) return { handled: false, reason: 'duplicate' };
      this.seen.set(id, Date.now());
    }
    if (!ctx.command) return { handled: false, reason: 'not-command' };
    if (ctx.isGroup && !ctx.isOwner && !ctx.profile?.registered && ctx.command !== 'daftar') {
      await ctx.reply('Kamu belum terdaftar. Daftar dulu dengan format: *' + (ctx.prefix || '.') + 'daftar nama*');
      return { handled: true, reason: 'registration' };
    }
    if (this.menuService?.canHandle(ctx.command)) {
      if (!this.allowRate(ctx)) {
        const key = ctx.sender || ctx.chat || 'unknown';
        if (!this.rateWarnings.has(key)) { this.rateWarnings.set(key, Date.now()); await ctx.reply('Terlalu banyak command. Tunggu sebentar lalu coba lagi.'); }
        return { handled: true, command: ctx.command, reason: 'rate-limit' };
      }
      try {
        await this.recordCommand(ctx);
        await this.menuService.execute(ctx);
        return { handled: true, command: ctx.command, builtin: true };
      } catch (error) {
        this.logger.error('Menu bawaan gagal ditampilkan.', { command: ctx.command, error });
        try { await ctx.reply('Menu gagal ditampilkan. Coba lagi sebentar.'); } catch { /* chat mungkin sudah tidak tersedia */ }
        return { handled: true, command: ctx.command, error };
      }
    }
    const plugin = this.registry.getByCommand(ctx.command);
    if (!plugin) return { handled: false, reason: 'unknown-command' };
    if (!this.allowRate(ctx)) {
      const key = ctx.sender || ctx.chat || 'unknown';
      if (!this.rateWarnings.has(key)) { this.rateWarnings.set(key, Date.now()); await ctx.reply('Terlalu banyak command. Tunggu sebentar lalu coba lagi.'); }
      return { handled: true, plugin: plugin.name, reason: 'rate-limit' };
    }
    const permission = validatePermission(plugin, ctx);
    if (!permission.allowed) {
      const messages = { registration: 'Kamu belum terdaftar. Gunakan .daftar nama terlebih dahulu.', role: 'Role akunmu belum memiliki akses ke fitur ini. Hubungi owner bot.', owner: 'Fitur ini khusus owner.', group: 'Command ini hanya dapat digunakan di grup.', private: 'Command ini hanya dapat digunakan di chat pribadi.', admin: 'Hanya admin grup yang dapat menggunakan command ini.', 'bot-admin': 'Bot harus menjadi admin grup untuk menjalankan command ini.', restricted: 'Bot sedang dalam mode self.' };
      await ctx.reply(messages[permission.reason] || 'Akses ditolak.');
      return { handled: true, plugin: plugin.name, reason: permission.reason };
    }
    if (this.activeCommands >= this.maxConcurrentCommands) {
      await ctx.reply('Bot sedang sibuk. Coba lagi sebentar.');
      return { handled: true, plugin: plugin.name, reason: 'busy' };
    }
    this.activeCommands += 1;
    await this.recordCommand(ctx);
    const startedAt = Date.now();
    try {
      await plugin.execute(ctx);
      const activity = { plugin: plugin.name, command: ctx.command, category: plugin.category, scope: ctx.isGroup ? 'group' : 'private', durationMs: Date.now() - startedAt };
      if (typeof this.logger.activity === 'function') this.logger.activity(activity);
      else this.logger.info('Plugin berhasil dijalankan.', { plugin: plugin.name, command: ctx.command });
      return { handled: true, plugin: plugin.name };
    } catch (error) {
      const reference = randomBytes(4).toString('hex').toUpperCase();
      this.logger.error('Plugin gagal saat dieksekusi.', {
        plugin: plugin.name, command: ctx.command, stage: 'execute', reference, error
      });
      try {
        await ctx.reply(formatPluginFailure({
          plugin: plugin.name, command: ctx.command, error, stage: 'execute', reference
        }));
      } catch (replyError) {
        this.logger.warn('Gagal mengirim pesan error plugin.', {
          plugin: plugin.name, command: ctx.command, reference, error: replyError.message
        });
      }
      return { handled: true, plugin: plugin.name, error, reference };
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

module.exports = { CommandDispatcher, formatPluginFailure, diagnosePluginError };
