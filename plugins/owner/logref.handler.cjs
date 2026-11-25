'use strict';

const { findErrorByReference, normalizeReference } = require('../../src/core/services/error-log.service');

function logPaths(config) {
  return {
    directory: config?.paths?.logs || './logs',
    filename: config?.logging?.fileName || 'muse-md.jsonl'
  };
}

function formatErrorLogEntry(entry) {
  const data = entry?.data || {};
  const error = data.error || {};
  const lines = [
    '*LOG ERROR ' + (data.reference || '-') + '*',
    'Waktu: ' + String(entry?.timestamp || '-'),
    'Plugin: ' + (data.plugin || '-'),
    'Command: ' + (data.command || '-'),
    'Tahap: ' + (data.stage || '-'),
    'Error: ' + (error.name || 'Error'),
    'Detail: ' + String(error.message || '-').slice(0, 1200)
  ];
  if (Array.isArray(error.providerErrors) && error.providerErrors.length) {
    lines.push('Provider: ' + error.providerErrors.join(' | ').slice(0, 800));
  }
  lines.push('', 'Log lengkap (termasuk stack trace) ada di file JSON log.');
  return lines.join('\n');
}

module.exports = {
  name: 'owner-logref',
  commands: ['logref'],
  category: 'owner',
  description: 'Menampilkan log error plugin berdasarkan ID referensi (REF).',
  usage: '.logref <REF>',
  permissions: { ownerOnly: true },
  async execute(ctx) {
    if (!ctx.isOwner) return ctx.reply('Fitur ini khusus owner.');
    const query = String(ctx.args?.[0] || '').trim();
    if (!query) return ctx.reply('Gunakan .logref <REF>. Contoh: ' + ctx.prefix + 'logref 6E397A04');
    let reference;
    try { reference = normalizeReference(query); }
    catch { return ctx.reply('ID referensi harus 8 karakter heksadesimal. Contoh: ' + ctx.prefix + 'logref 6E397A04'); }
    const { directory, filename } = logPaths(ctx.config);
    let entry;
    try { entry = await findErrorByReference({ directory, filename, reference }); }
    catch { return ctx.reply('Log error gagal dibaca dari ' + directory + '.'); }
    if (!entry) {
      return ctx.reply('Log dengan REF ' + reference + ' tidak ditemukan di ' + filename + ' (termasuk file rotasi). Pastikan REF benar dan log belum terhapus oleh rotasi.');
    }
    await ctx.reply(formatErrorLogEntry(entry));
  }
};

module.exports.formatErrorLogEntry = formatErrorLogEntry;
