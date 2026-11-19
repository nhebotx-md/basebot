'use strict';

/**
 * BASEBOT user configuration.
 * Customize this file only. Keep API credentials in .env.
 * Restart BASEBOT after changing settings.
 */
module.exports = {
  botName: 'BASEBOT',
  ownerName: 'Owner',
  owners: [],
  prefix: '.',
  publicMode: true,
  pairing: { phone: '', code: '' },
  welcomeEnabled: true,
  newsletter: { name: '', id: '', url: '' },
  timezone: 'Asia/Jakarta',

  sticker: {
    packname: 'BASEBOT',
    author: '',
    apis: { asepharyanaEnabled: false }
  },
  tts: { voiceId: '' },
  downloaders: {
    fallbackEnabled: true,
    ytDlpEnabled: true,
    ytDlpPath: 'yt-dlp',
    tempDir: './storage/temp'
  },

  logging: {
    level: 'info',
    format: 'pretty',
    color: 'auto',
    baileysLevel: 'warn',
    fileEnabled: true,
    fileName: 'basebot.jsonl',
    fileMaxBytes: 5242880,
    fileMaxFiles: 5
  },
  commandLimits: {
    rateLimit: 8,
    rateWindowMs: 10000,
    maxConcurrent: 20
  },
  paths: {
    session: './session',
    temp: './storage/temp',
    logs: './logs',
    database: './data/database'
  },
  profile: { expPerMessage: 5, expCooldownMs: 60000 },
  plugins: {
    directory: './plugins',
    reload: false,
    autoReload: true,
    watchDebounceMs: 700
  }
};
