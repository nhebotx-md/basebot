'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createLogger } = require('../services/logger.service');
const { downloadBuffer } = require('../services/media.service');

function securePrivateDirectory(directory) {
  const root = path.resolve(directory);
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  function secure(target) {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink() || !stat.isDirectory() || fs.realpathSync(target) !== target) throw new Error('Direktori session/temp harus berupa direktori nyata tanpa symlink.');
    fs.chmodSync(target, 0o700);
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      const child = path.join(target, entry.name);
      const childStat = fs.lstatSync(child);
      if (childStat.isSymbolicLink()) throw new Error('Symlink tidak diizinkan di direktori session/temp.');
      if (childStat.isDirectory()) secure(child);
      else if (childStat.isFile()) fs.chmodSync(child, 0o600);
      else throw new Error('Tipe file tidak didukung di direktori session/temp.');
    }
  }
  secure(root);
  return root;
}

function createClientFactory({ config, logger = createLogger(), dependencies } = {}) {
  const suppliedBaileys = dependencies?.baileys;
  const pino = dependencies?.pino || require('pino');
  return async function createClient() {
    const baileys = suppliedBaileys || await import('@itsliaaa/baileys');
    const sessionDirectory = securePrivateDirectory(config.paths.session);
    securePrivateDirectory(config.paths.temp);
    const { state, saveCreds } = await baileys.useMultiFileAuthState(sessionDirectory);
    securePrivateDirectory(sessionDirectory);
    const baileysLogOptions = {
      level: config.logging?.baileysLevel || 'warn',
      base: { component: 'baileys' },
      redact: {
        paths: ['token', 'secret', 'password', 'authorization', 'cookie', 'qr', 'creds', 'auth', 'authState.creds', 'pairingCode', 'apiKey', 'me', 'jid', 'remoteJid', 'chatId', 'participant', 'participantJid', 'phone', 'phoneNumber', 'user', 'name'],
        censor: '[REDACTED]'
      }
    };
    if (typeof pino.stdTimeFunctions?.isoTime === 'function') baileysLogOptions.timestamp = pino.stdTimeFunctions.isoTime;
    const sock = baileys.makeWASocket({
      auth: state,
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 30000,
      keepAliveIntervalMs: 15000,
      logger: pino(baileysLogOptions)
    });
    // Baileys exposes this in some builds but not all forks; keep the auth state explicit.
    sock.authState = state;

    let credentialSaveQueue = Promise.resolve();
    let credentialSaveError = null;
    sock.ev.on('creds.update', update => {
      credentialSaveQueue = credentialSaveQueue.then(async () => {
        await saveCreds(update);
        securePrivateDirectory(sessionDirectory);
        credentialSaveError = null;
        logger.debug('Pembaruan kredensial WhatsApp tersimpan.', { registered: Boolean(state.creds?.registered), hasIdentity: Boolean(state.creds?.me?.id) });
      }).catch(error => {
        credentialSaveError = error;
        logger.error('Penyimpanan kredensial WhatsApp gagal.', { error });
      });
    });
    sock.waitForCredentialPersistence = async () => {
      let queue;
      do {
        queue = credentialSaveQueue;
        await queue;
      } while (queue !== credentialSaveQueue);
      if (credentialSaveError) throw new Error('Pembaruan kredensial WhatsApp terakhir tidak berhasil disimpan.', { cause: credentialSaveError });
    };

    sock.decodeJid = jid => {
      if (!jid || !/:\d+@/.test(jid)) return jid;
      const decoded = baileys.jidDecode(jid);
      return decoded?.user && decoded?.server ? `${decoded.user}@${decoded.server}` : jid;
    };
    sock.downloadMediaMessage = async message => {
      const mime = message?.mimetype || '';
      const type = message?.mtype?.replace(/Message$/i, '') || mime.split('/')[0];
      if (!type || !message) throw new Error('Pesan media tidak valid.');
      const stream = await baileys.downloadContentFromMessage(message, type);
      const chunks = [];
      let size = 0;
      for await (const chunk of stream) {
        size += chunk.length;
        if (size > 20 * 1024 * 1024) throw new Error('Media melebihi batas 20 MB.');
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks, size);
    };
    sock.downloadAndSaveMediaMessage = async (message, filename = crypto.randomBytes(12).toString('hex')) => {
      const media = message?.msg || message;
      const buffer = await sock.downloadMediaMessage(media);
      const ext = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'video/mp4': '.mp4', 'audio/ogg': '.ogg', 'audio/mpeg': '.mp3' })[media.mimetype] || '.bin';
      const safeName = path.basename(filename).replace(/[^a-z0-9_-]/gi, '').slice(0, 64) || crypto.randomBytes(8).toString('hex');
      const target = path.resolve(config.paths.temp, `${safeName}${ext}`);
      if (!target.startsWith(`${path.resolve(config.paths.temp)}${path.sep}`)) throw new Error('Path media tidak valid.');
      await fs.promises.writeFile(target, buffer, { mode: 0o600, flag: 'wx' });
      return target;
    };
    sock.sendImageAsSticker = async (jid, input, quoted, options = {}) => {
      const { addExif, writeExifImg } = require('../../../start/lib/exif');
      let buffer;
      if (Buffer.isBuffer(input)) buffer = input;
      else if (typeof input === 'string' && /^https?:\/\//i.test(input)) { buffer = (await downloadBuffer(input, { maxBytes: 15 * 1024 * 1024, timeoutMs: 15000 })).buffer; }
      else if (typeof input === 'string') buffer = await fs.promises.readFile(input);
      else throw new TypeError('Sumber sticker tidak valid.');
      const sticker = options.packname || options.author ? await writeExifImg(buffer, options) : await addExif(buffer);
      try { await sock.sendMessage(jid, { sticker: { url: sticker } }, { quoted }); }
      finally { if (typeof sticker === 'string') await fs.promises.unlink(sticker).catch(() => {}); }
      return sticker;
    };
    sock.sendVideoAsSticker = async (jid, input, quoted, options = {}) => {
      const { videoToWebp, writeExifVid } = require('../../../start/lib/exif');
      let buffer;
      if (Buffer.isBuffer(input)) buffer = input;
      else if (typeof input === 'string' && /^https?:\/\//i.test(input)) { buffer = (await downloadBuffer(input, { maxBytes: 15 * 1024 * 1024, timeoutMs: 15000 })).buffer; }
      else if (typeof input === 'string') buffer = await fs.promises.readFile(input);
      else throw new TypeError('Sumber sticker tidak valid.');
      const sticker = options.packname || options.author ? await writeExifVid(buffer, options) : await videoToWebp(buffer);
      try { await sock.sendMessage(jid, { sticker: { url: sticker } }, { quoted }); }
      finally { if (typeof sticker === 'string') await fs.promises.unlink(sticker).catch(() => {}); }
      return sticker;
    };
    sock.albumMessage = async (jid, items, quoted) => {
      let result;
      for (const item of items) result = await sock.sendMessage(jid, item, { quoted });
      return result;
    };
    sock.sendStatusMention = async (content, jids = []) => sock.sendMessage('status@broadcast', content, { statusJidList: jids });
    logger.info('Socket WhatsApp dibuat.', { authDirectory: sessionDirectory, baileysLogLevel: baileysLogOptions.level });
    return sock;
  };
}

module.exports = { createClientFactory, securePrivateDirectory };
