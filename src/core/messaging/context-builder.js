'use strict';

const { parseCommand } = require('./command-parser');
const { normalizeIdentity } = require('../security/permission-manager');
const { createMessageService } = require('../services/message.service');
const { createStorageService } = require('../services/storage.service');
const { createDownloaderService } = require('../services/downloader.service');
const { downloadBuffer } = require('../services/media.service');
const { fetchPublic, postPublicJson } = require('../security/safe-url');

function isPhoneIdentity(value) {
  return typeof value === 'string' && /@(s\.whatsapp\.net|c\.us)$/i.test(value);
}

async function resolveIdentity(value, client, decode) {
  const identity = normalizeIdentity(value, decode);
  if (!identity || !identity.endsWith('@lid')) return identity;

  const lidMapping = client.signalRepository?.lidMapping;
  if (typeof lidMapping?.getPNForLID !== 'function') return identity;

  try {
    const phoneJid = await lidMapping.getPNForLID(identity);
    const mappedIdentity = normalizeIdentity(phoneJid, decode);
    return mappedIdentity || identity;
  } catch {
    // Permission checks remain fail-closed when Baileys has no LID mapping.
    return identity;
  }
}

async function resolveBestIdentity(values, client, decode) {
  let fallback = '';
  for (const value of values) {
    const identity = await resolveIdentity(value, client, decode);
    if (!identity) continue;
    if (!fallback) fallback = identity;
    if (isPhoneIdentity(identity)) return identity;
  }
  return fallback;
}

const newsletterOwnerCache = new WeakMap();
const NEWSLETTER_OWNER_CACHE_TTL_MS = 5 * 60 * 1000;

async function resolveNewsletterOwner({ client, newsletterJid, ownerSet, decode }) {
  if (!newsletterJid || !newsletterJid.endsWith('@newsletter')) return { isOwner: false, metadata: null };
  if (typeof client.newsletterMetadata !== 'function') return { isOwner: false, metadata: null };

  let cache = newsletterOwnerCache.get(client);
  if (!cache) {
    cache = new Map();
    newsletterOwnerCache.set(client, cache);
  }

  const cached = cache.get(newsletterJid);
  let metadata;
  if (cached && cached.expiresAt > Date.now()) {
    metadata = cached.metadata;
  } else {
    try {
      metadata = await client.newsletterMetadata(newsletterJid);
      cache.set(newsletterJid, { metadata: metadata || null, expiresAt: Date.now() + NEWSLETTER_OWNER_CACHE_TTL_MS });
    } catch {
      // Metadata lookup failure must never grant channel owner permissions.
      cache.delete(newsletterJid);
      return { isOwner: false, metadata: null };
    }
  }

  const channelOwner = await resolveIdentity(metadata?.owner, client, decode);
  return {
    isOwner: Boolean(channelOwner && ownerSet.has(channelOwner)),
    metadata: metadata || null,
    channelOwner
  };
}

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
  const senderCandidates = m.fromMe
    ? [client.user?.id, ...(Array.isArray(m.senderCandidates) ? m.senderCandidates : [])]
    : (Array.isArray(m.senderCandidates) && m.senderCandidates.length ? m.senderCandidates : [m.sender]);
  const sender = await resolveBestIdentity(senderCandidates, client, decode);
  const bot = await resolveBestIdentity([client.user?.id], client, decode);
  const newsletterOwnership = m.isNewsletter
    ? await resolveNewsletterOwner({ client, newsletterJid: m.chat, ownerSet, decode })
    : { isOwner: false, metadata: null, channelOwner: '' };
  const participantList = Array.isArray(groupMetadata?.participants) ? groupMetadata.participants : [];
  const adminIds = new Set(await Promise.all(
    participantList
      .filter(item => item.admin === 'admin' || item.admin === 'superadmin')
      .map(item => resolveBestIdentity([item.id, item.phoneNumber], client, decode))
  ));
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
    downloaders: createDownloaderService(),
    http: { postJsonPublic: postPublicJson },
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
    isNewsletter: Boolean(m.isNewsletter), isChannel: Boolean(m.isChannel),
    channelPublisher: m.channelPublisher || null,
    channelMetadata: newsletterOwnership.metadata,
    channelOwner: newsletterOwnership.channelOwner || '',
    isOwner: ownerSet.has(sender) || newsletterOwnership.isOwner || (m.fromMe && Boolean(bot) && sender === bot), isGroupAdmin: Boolean(m.isGroup && adminIds.has(sender)),
    isBotAdmin: Boolean(m.isGroup && adminIds.has(bot)), groupMetadata, publicMode: client.public !== false,
    reply: (text, options) => messageService.reply(m, text, options),
    react: emoji => messageService.react(m, emoji),
    sendMessage: (jid, content, options) => messageService.sendMessage(jid, content, options),
    quoted, mime: (quoted?.msg || {}).mimetype || ''
  };
}

module.exports = { buildContext, resolveIdentity, resolveBestIdentity, resolveNewsletterOwner };
