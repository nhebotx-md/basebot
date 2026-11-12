'use strict';

function validateConfig(config) {
  if (!config || !Array.isArray(config.owners)) throw new TypeError('Konfigurasi owners harus berupa array.');
  for (const owner of config.owners) {
    if (!/^\+?[1-9]\d{5,14}$/.test(owner.replace(/\D/g, ''))) {
      throw new Error('OWNER_NUMBERS berisi nomor yang tidak valid. Gunakan kode negara dan angka saja.');
    }
  }
  if (typeof config.prefix !== 'string' || !config.prefix.trim() || /\s/.test(config.prefix) || config.prefix.length > 8) throw new Error('BOT_PREFIX harus berupa teks tanpa spasi, maksimal 8 karakter.');
  if (config.pairing.phone && !/^\d{6,15}$/.test(config.pairing.phone)) throw new Error('PAIRING_PHONE harus berupa angka dengan kode negara, tanpa tanda + atau spasi.');
  if (!['debug', 'info', 'warn', 'error', 'silent'].includes(config.logging.level)) throw new Error('LOG_LEVEL tidak dikenal.');
  if (!['pretty', 'json'].includes(config.logging.format || 'pretty')) throw new Error('LOG_FORMAT harus bernilai pretty atau json.');
  if (!['auto', 'always', 'never'].includes(config.logging.color || 'auto')) throw new Error('LOG_COLOR harus bernilai auto, always, atau never.');
  if (!['debug', 'info', 'warn', 'error', 'silent'].includes(config.logging.baileysLevel || 'warn')) throw new Error('BAILEYS_LOG_LEVEL tidak dikenal.');
  if (config.sticker?.apis && typeof config.sticker.apis.asepharyanaEnabled !== 'boolean') throw new Error('STICKER_API_ASEPHARYANA_ENABLED harus berupa boolean.');
  try { new Intl.DateTimeFormat('id-ID', { timeZone: config.timezone }).format(); } catch { throw new Error('TIMEZONE harus berupa zona waktu IANA yang valid.'); }
  return true;
}

module.exports = { validateConfig };
