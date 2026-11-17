'use strict';

const { randomBytes } = require('node:crypto');
const { validatePermission } = require('../security/permission-manager');
const { createPluginProgress } = require('../services/plugin-progress.service');

function editDistance(left, right) {
  const a = String(left || '').toLowerCase();
  const b = String(right || '').toLowerCase();
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

function commandSimilarity(input, candidate) {
  const left = String(input || '').toLowerCase();
  const right = String(candidate || '').toLowerCase();
  if (!left || !right) return 0;
  if (left === right) return 1;
  const distance = editDistance(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

function findCommandSuggestions(input, registry, ctx, limit = 3) {
  const candidates = new Map();
  for (const plugin of registry.list({ includeDisabled: false })) {
    if (!validatePermission(plugin, ctx).allowed) continue;
    for (const command of plugin.commands || []) {
      const score = commandSimilarity(input, command);
      if (score >= 0.58) candidates.set(command, { command, score });
    }
  }
  return [...candidates.values()]
    .sort((a, b) => b.score - a.score || a.command.localeCompare(b.command))
    .slice(0, limit);
}

function safeErrorDetail(error) {
  const raw = String(error?.message || error || 'Tidak ada detail tambahan.');
  return raw
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/-]+=*/gi, '$1 [disamarkan]')
    .replace(/\b(authorization|cookie|set-cookie|x-api-key|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|token|password|passwd|secret)\b(["']?\s*[:=]\s*["']?)(?:"[^"]*"|'[^']*'|[^\s,;&]+)/gi, '$1$2[disamarkan]')
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[JWT disamarkan]')
    .replace(/https?:\/\/\S+/gi, '[URL disamarkan]')
    .replace(/(?:[A-Z]:\\|\/)(?:[^\s:]+\/)*[^\s:]*/gi, '[path disamarkan]')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .trim()
    .slice(0, 180) || 'Tidak ada detail tambahan.';
}

function diagnosePluginError(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  const status = Number(error?.statusCode || error?.status || 0);
  if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNABORTED', 'ERR_NETWORK', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'ABORT_ERR'].includes(code) || /network|fetch failed|timed? ?out|socket hang up|aborted/.test(message)) {
    return { cause: 'Koneksi ke Layanan eksternal terputus, gagal ditemukan, atau melewati batas waktu.', action: 'Periksa koneksi server, DNS, timeout request, dan status provider. Ulangi setelah layanan kembali normal.' };
  }
  if (status === 401 || status === 403) {
    return { cause: 'Layanan tujuan menolak autentikasi atau akses API.', action: 'Periksa API key, izin akun provider, dan konfigurasi environment. Perbarui kredensial di .env tanpa membagikannya ke chat.' };
  }
  if (status === 404) {
    return { cause: 'Endpoint atau resource yang diminta tidak ditemukan.', action: 'Periksa URL endpoint, parameter request, dan perubahan API dari provider.' };
  }
  if (status === 429) {
    return { cause: 'Batas request atau kuota layanan eksternal sedang tercapai.', action: 'Kurangi frekuensi request, periksa kuota provider, lalu coba lagi setelah periode limit berakhir.' };
  }
  if (status >= 500) {
    return { cause: 'Server provider mengalami gangguan internal.', action: 'Periksa status layanan provider dan coba ulangi beberapa saat lagi. Jika berulang, siapkan fallback provider.' };
  }
  if (status >= 400 || /http \\d{3}/.test(message)) {
    return { cause: 'Layanan tujuan menolak request karena parameter atau kebijakan akses.', action: 'Periksa format input, endpoint, parameter, dan izin akses API.' };
  }
  if (code === 'FFMPEG_BINARY_MISSING') {
    return { cause: 'Executable FFmpeg tidak tersedia pada instalasi BASEBOT.', action: 'Jalankan npm ci dari direktori project, pastikan dependency platform cocok, lalu restart bot.' };
  }
  if (['ENOENT', 'EACCES', 'EPERM', 'ENOSPC'].includes(code)) {
    return { cause: 'File atau direktori yang dibutuhkan tidak tersedia atau tidak dapat diakses.', action: 'Periksa lokasi file, izin akses direktori, ruang penyimpanan, dan dependency yang dibutuhkan.' };
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
    if (!plugin) {
      const suggestions = findCommandSuggestions(ctx.command, this.registry, ctx);
      if (suggestions.length) {
        const lines = ['Command *' + (ctx.prefix || '.') + ctx.command + '* tidak ditemukan.', 'Mungkin maksudmu:'];
        for (const item of suggestions) lines.push('• *' + (ctx.prefix || '.') + item.command + '*');
        lines.push('Gunakan *' + (ctx.prefix || '.') + 'menu* untuk melihat daftar fitur.');
        await ctx.reply(lines.join('\n'));
        return { handled: true, reason: 'unknown-command', suggestions: suggestions.map(item => item.command) };
      }
      return { handled: false, reason: 'unknown-command' };
    }
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
    ctx.progress = createPluginProgress({ client: ctx.client, message: ctx.m, plugin, command: ctx.command, logger: this.logger, botName: ctx.config?.botName || 'ShooNhee-AI' });
    ctx.process = ctx.progress;
    if (ctx.services) ctx.services.progress = ctx.progress;
    await this.recordCommand(ctx);
    const startedAt = Date.now();
    try {
      await plugin.execute(ctx);
      if (ctx.progress.isStarted() && !ctx.progress.isFinished()) {
        try { await ctx.progress.complete('Plugin berhasil menyelesaikan seluruh tahap proses'); }
        catch (progressError) { this.logger.warn?.('Pesan penyelesaian progres gagal diperbarui.', { plugin: plugin.name, error: progressError.message }); }
      }
      const activity = { plugin: plugin.name, command: ctx.command, category: plugin.category, scope: ctx.isGroup ? 'group' : 'private', durationMs: Date.now() - startedAt };
      if (typeof this.logger.activity === 'function') this.logger.activity(activity);
      else this.logger.info('Plugin berhasil dijalankan.', { plugin: plugin.name, command: ctx.command });
      return { handled: true, plugin: plugin.name };
    } catch (error) {
      const reference = randomBytes(4).toString('hex').toUpperCase();
      this.logger.error('Plugin gagal saat dieksekusi.', {
        plugin: plugin.name, command: ctx.command, stage: 'execute', reference, error
      });
      if (ctx.progress?.isStarted() && !ctx.progress.isFinished()) {
        try { await ctx.progress.fail('Plugin gagal menyelesaikan proses', { detail: 'Ref: ' + reference }); }
        catch (progressError) { this.logger.warn?.('Pesan kegagalan progres tidak dapat diperbarui.', { plugin: plugin.name, reference, error: progressError.message }); }
      }
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
      catch (error) {
        const reference = randomBytes(4).toString('hex').toUpperCase();
        this.logger.error('Plugin event gagal.', {
          plugin: plugin.name, eventName, stage: 'event', reference, error,
          diagnosis: diagnosePluginError(error)
        });
        results.push({ plugin: plugin.name, ok: false, reference });
      }
      finally { this.activeCommands -= 1; }
    }
    return results;
  }
}

module.exports = { CommandDispatcher, formatPluginFailure, diagnosePluginError, commandSimilarity, findCommandSuggestions };
