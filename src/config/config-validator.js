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
  if (typeof config.logging.fileEnabled !== 'boolean') throw new Error('LOG_FILE_ENABLED harus berupa boolean.');
  if (typeof config.logging.fileName !== 'string' || !/^[a-zA-Z0-9._-]{1,64}$/.test(config.logging.fileName) || config.logging.fileName === '.' || config.logging.fileName === '..') throw new Error('LOG_FILE_NAME harus berupa nama file sederhana tanpa path.');
  if (!Number.isInteger(config.logging.fileMaxBytes) || config.logging.fileMaxBytes < 65536 || config.logging.fileMaxBytes > 104857600) throw new Error('LOG_FILE_MAX_BYTES harus antara 65536 dan 104857600.');
  if (!Number.isInteger(config.logging.fileMaxFiles) || config.logging.fileMaxFiles < 2 || config.logging.fileMaxFiles > 20) throw new Error('LOG_FILE_MAX_FILES harus antara 2 dan 20.');
  if (!Number.isInteger(config.commandLimits?.rateLimit) || config.commandLimits.rateLimit < 0 || config.commandLimits.rateLimit > 100) throw new Error('COMMAND_RATE_LIMIT harus antara 0 dan 100.');
  if (!Number.isInteger(config.commandLimits?.rateWindowMs) || config.commandLimits.rateWindowMs < 1000 || config.commandLimits.rateWindowMs > 600000) throw new Error('COMMAND_RATE_WINDOW_MS harus antara 1000 dan 600000.');
  if (!Number.isInteger(config.commandLimits?.maxConcurrent) || config.commandLimits.maxConcurrent < 1 || config.commandLimits.maxConcurrent > 100) throw new Error('MAX_CONCURRENT_COMMANDS harus antara 1 dan 100.');
  if (config.sticker?.apis && typeof config.sticker.apis.asepharyanaEnabled !== 'boolean') throw new Error('STICKER_API_ASEPHARYANA_ENABLED harus berupa boolean.');
  try { new Intl.DateTimeFormat('id-ID', { timeZone: config.timezone }).format(); } catch { throw new Error('TIMEZONE harus berupa zona waktu IANA yang valid.'); }
  return true;
}

module.exports = { validateConfig };
