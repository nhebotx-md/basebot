'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateConfig } = require('./config-validator');

function parseBoolean(value, fallback) {
  if (value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return /^(1|true|yes|on)$/i.test(String(value));
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.floor(parsed)));
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

function resolveSettingsPath(root = path.resolve(__dirname, '../..')) {
  const local = path.join(root, 'settings.js');
  const example = path.join(root, 'settings.example.js');
  if (fs.existsSync(local)) return local;
  if (fs.existsSync(example)) return example;
  throw new Error('Konfigurasi tidak ditemukan. Salin settings.example.js menjadi settings.js lalu sesuaikan konfigurasi bot.');
}

function getSettingsSource(root = path.resolve(__dirname, '../..')) {
  return path.basename(resolveSettingsPath(root)) === 'settings.js' ? 'local' : 'template';
}

function loadConfig(env = readDotEnv(), settings = require(resolveSettingsPath())) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new TypeError('settings.js harus mengekspor object konfigurasi.');
  }
  const source = settings;
  const config = {
    botName: source.botName || 'BASEBOT',
    ownerName: source.ownerName || 'Owner',
    owners: Array.isArray(source.owners) ? source.owners.map(value => String(value).replace(/\D/g, '')).filter(Boolean) : [],
    prefix: String(source.prefix ?? '.'),
    publicMode: parseBoolean(source.publicMode, true),
    pairing: { phone: String(source.pairing?.phone || ''), code: String(source.pairing?.code || '') },
    welcomeEnabled: parseBoolean(source.welcomeEnabled, true),
    newsletter: { name: source.newsletter?.name || '', id: source.newsletter?.id || '', url: source.newsletter?.url || '' },
    timezone: source.timezone || 'Asia/Jakarta',
    sticker: {
      packname: source.sticker?.packname || 'BASEBOT',
      author: source.sticker?.author || '',
      apis: { asepharyanaEnabled: parseBoolean(source.sticker?.apis?.asepharyanaEnabled, false) }
    },
    tts: { apiKey: env.TTS_API_KEY || '', voiceId: source.tts?.voiceId || '' },
    downloaders: {
      fallbackEnabled: parseBoolean(source.downloaders?.fallbackEnabled, true),
      soclipApiKey: env.SOCLIP_API_KEY || '',
      ytDlpEnabled: parseBoolean(source.downloaders?.ytDlpEnabled, true),
      ytDlpPath: source.downloaders?.ytDlpPath || 'yt-dlp',
      tempDir: source.downloaders?.tempDir || './storage/temp',
      providerTimeoutMs: boundedInteger(source.downloaders?.providerTimeoutMs, 30000, 1000, 120000),
      providerRetries: boundedInteger(source.downloaders?.providerRetries, 0, 0, 3),
      providerFailureThreshold: boundedInteger(source.downloaders?.providerFailureThreshold, 2, 1, 10),
      providerCooldownMs: boundedInteger(source.downloaders?.providerCooldownMs, 30000, 1000, 600000)
    },
    logging: {
      level: source.logging?.level || 'info',
      format: source.logging?.format || 'pretty',
      color: source.logging?.color || 'auto',
      baileysLevel: source.logging?.baileysLevel || 'warn',
      fileEnabled: parseBoolean(source.logging?.fileEnabled, true),
      fileName: source.logging?.fileName || 'basebot.jsonl',
      fileMaxBytes: boundedInteger(source.logging?.fileMaxBytes, 5242880, 65536, 104857600),
      fileMaxFiles: boundedInteger(source.logging?.fileMaxFiles, 5, 2, 20)
    },
    commandLimits: {
      rateLimit: boundedInteger(source.commandLimits?.rateLimit, 8, 0, 100),
      rateWindowMs: boundedInteger(source.commandLimits?.rateWindowMs, 10000, 1000, 600000),
      maxConcurrent: boundedInteger(source.commandLimits?.maxConcurrent, 20, 1, 100),
      maxQueued: boundedInteger(source.commandLimits?.maxQueued, 100, 0, 1000)
    },
    paths: {
      session: source.paths?.session || './session',
      temp: source.paths?.temp || './storage/temp',
      logs: source.paths?.logs || './logs',
      database: source.paths?.database || './data/database'
    },
    profile: {
      expPerMessage: Math.max(0, Number(source.profile?.expPerMessage ?? 5) || 0),
      expCooldownMs: Math.max(0, Number(source.profile?.expCooldownMs ?? 60000) || 0)
    },
    plugins: {
      directory: source.plugins?.directory || './plugins',
      reload: parseBoolean(source.plugins?.reload, false),
      autoReload: parseBoolean(source.plugins?.autoReload, true),
      watchDebounceMs: Math.max(150, Math.min(5000, Number(source.plugins?.watchDebounceMs) || 700))
    }
  };
  validateConfig(config);
  return config;
}

module.exports = { loadConfig, readDotEnv, resolveSettingsPath, getSettingsSource };
