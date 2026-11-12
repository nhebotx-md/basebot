'use strict';

const fs = require('node:fs');
const { validateConfig } = require('./config-validator');

function parseBoolean(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value));
}

function readDotEnv(file = '.env', target = process.env) {
  if (!fs.existsSync(file)) return target;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || Object.hasOwn(target, match[1])) continue;
    let value = match[2].trim();
    const quote = value[0];
    if (quote === '"' || quote === "'") {
      const closing = value.lastIndexOf(quote);
      const trailing = closing > 0 ? value.slice(closing + 1).trim() : '';
      if (closing > 0 && (!trailing || trailing.startsWith('#'))) value = value.slice(1, closing);
      else value = value.replace(/\s+#.*$/, '');
    } else value = value.replace(/\s+#.*$/, '');
    target[match[1]] = value;
  }
  return target;
}

function loadConfig(env = readDotEnv()) {
  const config = {
    botName: env.BOT_NAME || 'BASEBOT', ownerName: env.OWNER_NAME || 'Owner',
    owners: String(env.OWNER_NUMBERS || '').split(/[\s,]+/).filter(Boolean),
    prefix: String(env.BOT_PREFIX || '.'), publicMode: parseBoolean(env.PUBLIC_MODE, true),
    pairing: { phone: env.PAIRING_PHONE || '', code: env.PAIRING_CODE || '' },
    welcomeEnabled: parseBoolean(env.WELCOME_ENABLED, true),
    newsletter: { name: env.NEWSLETTER_NAME || '', id: env.NEWSLETTER_ID || '', url: env.NEWSLETTER_URL || '' },
    timezone: env.TIMEZONE || 'Asia/Jakarta',
    sticker: { packname: env.STICKER_PACK_NAME || 'BASEBOT', author: env.STICKER_PACK_AUTHOR || '' },
    tts: { apiKey: env.TTS_API_KEY || '', voiceId: env.TTS_VOICE_ID || '' },
    logging: { level: env.LOG_LEVEL || 'info' },
    paths: { session: env.SESSION_DIR || './session', temp: env.TEMP_DIR || './storage/temp', logs: env.LOG_DIR || './logs' },
    plugins: { directory: env.PLUGINS_DIR || './plugins', reload: parseBoolean(env.PLUGIN_RELOAD, false) }
  };
  validateConfig(config);
  return config;
}

module.exports = { loadConfig, readDotEnv };
