'use strict';

const { parseCommand } = require('./command-parser');
const { normalizeIdentity } = require('../security/permission-manager');
const { getIdentityResolver } = require('../services/identity-resolver.service');
const { createRichMessageService } = require('../services/rich-message.service');
const { createMessageService } = require('../services/message.service');
const { createStorageService } = require('../services/storage.service');
const { createDownloaderService } = require('../services/downloader.service');
const { downloadBuffer } = require('../services/media.service');
const { fetchPublic, postPublicJson } = require('../security/safe-url');

function isPhoneIdentity(value) {
  return typeof value === 'string' && /@(s\\.whatsapp\\.net|c\\.us)$/i.test(value);
}

async function resolveIdentity(value, client, decode) {
  return getIdentityResolver(client).resolve(value, decode);
}

async function resolveBestIdentity(values, client, decode) {
  return getIdentityResolver(client).resolveBest(values, decode);
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
  const needsGroupMetadata = Boolean(m.isGroup && (targetPlugin?.permissions?.adminOnly || targetPlugin?.permissions?.botAdminOnly || (targetPlugin?.category?.toLowerCase() === 'group' && !targetPlugin?.permissions?.ownerOnly) || parsed?.command === 'del' || parsed?.command === 'menu' || parsed?.command === 'help' || parsed?.command === 'catmenu'));
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
  const quotedRemoteJid = quoteInfo.remoteJid || m.chat;
  let quotedFromMe = false;
  if (quoteInfo.stanzaId) {
    const quotedParticipant = await resolveBestIdentity([quoteInfo.participant, quoteInfo.participantAlt], client, decode);
    quotedFromMe = Boolean(bot && quotedParticipant === bot);
    if (!quotedFromMe && typeof client.isOwnMessageKey === 'function') {
      try { quotedFromMe = Boolean(client.isOwnMessageKey({ remoteJid: quotedRemoteJid, id: quoteInfo.stanzaId })); }
      catch { quotedFromMe = false; }
    }
  }
  let quoted = null;
  if (m.quoted && typeof m.quoted === 'object') {
    const type = Object.keys(m.quoted)[0] || '';
    const content = m.quoted[type] || {};
    const participant = quoteInfo.participant || quoteInfo.participantAlt || (quotedFromMe ? (m.isGroup ? client.user?.id : '') : m.sender);
    const key = { remoteJid: quotedRemoteJid, ...(participant ? { participant } : {}), fromMe: quotedFromMe, id: quoteInfo.stanzaId || '' };
    quoted = { ...m.quoted, mtype: type, msg: content, key, id: key.id, raw: { key, message: m.quoted, messageTimestamp: quoteInfo.messageTimestamp, pushName: quoteInfo.pushName }, text: content.text || content.caption || content.conversation || content.contentText || '', download: async () => client.downloadMediaMessage({ ...content, mtype: type }) };
  }
  const userProfile = registry.userService && sender ? await registry.userService.getProfile(sender) : null;
  const messageService = createMessageService(client, { botName: config.botName || 'ShooNhee-AI', verified: true });
  const services = {
    ...messageService, config, logger, store,
    identity: getIdentityResolver(client),
    richMessage: createRichMessageService(messageService.sendMessage),
    pluginManager: registry.pluginManager || null,
    health: registry.healthService || null,
    database: registry.databaseService || null,
    users: registry.userService || null,
    groups: registry.groupService || null,
    storage: createStorageService(config.paths.temp),
    media: { downloadBuffer },
    downloaders: createDownloaderService(config.downloaders || {}),
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
    isOwner: ownerSet.has(sender) || newsletterOwnership.isOwner, isGroupAdmin: Boolean(m.isGroup && adminIds.has(sender)),
    profile: userProfile,
    isRegistered: Boolean(userProfile?.registered),
    userRole: userProfile?.role || 'guest',
    userAccess: userProfile?.access || { commands: [], categories: [] },
    isBotAdmin: Boolean(m.isGroup && adminIds.has(bot)), groupMetadata, publicMode: client.public !== false,
    reply: (text, options) => messageService.reply(m, text, options),
    react: emoji => messageService.react(m, emoji),
    sendMessage: (jid, content, options) => messageService.sendMessage(jid, content, options),
    quoted, mime: (quoted?.msg || {}).mimetype || ''
  };
}

module.exports = { buildContext, resolveIdentity, resolveBestIdentity, resolveNewsletterOwner };
