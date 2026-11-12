'use strict';

const { parseCommand } = require('./command-parser');
const { normalizeIdentity } = require('../security/permission-manager');
const { createMessageService } = require('../services/message.service');
const { createStorageService } = require('../services/storage.service');
const { downloadBuffer } = require('../services/media.service');
const { fetchPublic } = require('../security/safe-url');

async function buildContext({ client, m, chatUpdate, store, config, registry, logger }) {
  const parsed = parseCommand(m.body, config.prefix);
  let groupMetadata = null;
  const targetPlugin = parsed ? registry.getByCommand(parsed.command) : null;
  const needsGroupMetadata = Boolean(m.isGroup && (targetPlugin?.permissions?.adminOnly || targetPlugin?.permissions?.botAdminOnly || parsed?.command === 'menu' || parsed?.command === 'catmenu'));
  if (needsGroupMetadata) {
    try { groupMetadata = await client.groupMetadata(m.chat); }
    catch (error) { logger.warn('Metadata grup tidak tersedia; izin admin ditolak.', { error: error.message }); }
  }
  const decode = client.decodeJid || (jid => jid);
  const ownerSet = new Set(config.owners.map(owner => normalizeIdentity(`${owner.replace(/\D/g, '')}@s.whatsapp.net`, decode)));
  const sender = normalizeIdentity(m.sender, decode);
  const bot = normalizeIdentity(client.user?.id || '', decode);
  const participantList = Array.isArray(groupMetadata?.participants) ? groupMetadata.participants : [];
  const adminIds = new Set(participantList.filter(item => item.admin === 'admin' || item.admin === 'superadmin').map(item => normalizeIdentity(item.id, decode)));
  const quoteInfo = m.msg?.contextInfo || {};
  let quoted = null;
  if (m.quoted && typeof m.quoted === 'object') {
    const type = Object.keys(m.quoted)[0] || '';
    const content = m.quoted[type] || {};
    const key = { remoteJid: quoteInfo.remoteJid || m.chat, participant: quoteInfo.participant || m.sender, fromMe: false, id: quoteInfo.stanzaId || '' };
    quoted = { ...m.quoted, mtype: type, msg: content, key, id: key.id, raw: { key, message: m.quoted, messageTimestamp: quoteInfo.messageTimestamp, pushName: quoteInfo.pushName }, text: content.text || content.caption || content.conversation || content.contentText || '', download: async () => client.downloadMediaMessage({ ...content, mtype: type }) };
  }
  const messageService = createMessageService(client);
  const services = {
    ...messageService, config, logger, store,
    storage: createStorageService(config.paths.temp),
    media: { downloadBuffer },
    fetchJson: async url => {
      const response = await fetchPublic(url, { timeoutMs: 15000, maxBytes: 512 * 1024 });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return JSON.parse(response.buffer.toString('utf8'));
    },
    sleep: ms => new Promise(resolve => setTimeout(resolve, ms))
  };
  return {
    client, sock: client, m, chatUpdate, store, registry, config, logger, services,
    command: parsed?.command || '', prefix: parsed?.prefix || config.prefix, args: parsed?.args || [], text: parsed?.text || '',
    sender, chat: m.chat, pushname: m.pushName, isGroup: m.isGroup, isPrivate: m.isPrivate,
    isOwner: ownerSet.has(sender) || (m.fromMe && Boolean(bot) && sender === bot), isGroupAdmin: Boolean(m.isGroup && adminIds.has(sender)),
    isBotAdmin: Boolean(m.isGroup && adminIds.has(bot)), groupMetadata, publicMode: client.public !== false,
    reply: (text, options) => messageService.reply(m, text, options),
    react: emoji => messageService.react(m, emoji),
    sendMessage: (jid, content, options) => messageService.sendMessage(jid, content, options),
    quoted, mime: (quoted?.msg || {}).mimetype || ''
  };
}

module.exports = { buildContext };
