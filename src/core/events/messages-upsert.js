'use strict';

const { normalizeMessage } = require('../messaging/normalize-message');
const { buildContext } = require('../messaging/context-builder');
const { containsExternalLink } = require('./anti-link');

function createMessagesUpsertHandler({ dispatcher, config, registry, logger, userService = registry.userService, groupService = registry.groupService }) {
  return async function onMessagesUpsert(client, chatUpdate, store) {
    for (const raw of chatUpdate?.messages || []) {
      if (!raw?.message || !raw.key?.remoteJid || raw.key.remoteJid === 'status@broadcast') continue;
      if (raw.key.fromMe && chatUpdate.type !== 'notify') continue;
      if (raw.key.id?.startsWith('BAE5') && raw.key.id.length === 16) continue;
      const m = normalizeMessage(raw, client);
      if (!m) continue;
      if (m.isGroup && m.mtype === 'groupStatusMentionMessage') {
        let enabled = true;
        try {
          const profile = await groupService?.getGroup(m.chat);
          enabled = profile?.settings?.antiStatusMention !== false;
        } catch (error) {
          logger.warn('Status anti-status-mention grup gagal dibaca; memakai default aman.', { chat: m.chat, error: error.message });
        }
        if (enabled) {
          try { await client.sendMessage(m.chat, { delete: m.key }); }
          catch (error) { logger.warn('Gagal menghapus pesan status grup.', { messageId: m.id, error: error.message }); }
        }
        continue;
      }
      if (!m.body && !m.message) continue;
      if (client.public === false && !m.fromMe) continue;
      try {
        const ctx = await buildContext({ client, m, chatUpdate, store, config, registry, logger });
        if (!m.isNewsletter && !m.fromMe && ctx.sender && userService) {
          try { ctx.profile = await userService.recordMessage(ctx.sender, { name: m.pushName, isGroup: m.isGroup }); }
          catch (error) { logger.warn('Gagal memperbarui profil pengguna; pemrosesan pesan tetap dilanjutkan.', { error: error.message }); }
        }
        if (m.isGroup && groupService) {
          try { ctx.groupProfile = await groupService.recordMessage(m.chat, { subject: ctx.groupMetadata?.subject }); }
          catch (error) { logger.warn('Gagal memperbarui statistik grup; pemrosesan pesan tetap dilanjutkan.', { error: error.message }); }
        }
        const antiLinkEnabled = m.isGroup && ctx.groupProfile?.settings?.antiLink === true;
        if (antiLinkEnabled && !m.fromMe && !ctx.isOwner && !ctx.isGroupAdmin && containsExternalLink(m.body)) {
          if (ctx.isBotAdmin) {
            try {
              await client.sendMessage(m.chat, { delete: m.key });
              await client.sendMessage(m.chat, {
                text: 'Tautan dihapus karena fitur anti-link aktif. Hanya admin grup yang dapat membagikan tautan.'
              });
            } catch (error) {
              logger.warn('Pesan bertautan gagal dihapus oleh anti-link.', { messageId: m.id, error: error.message });
            }
          } else {
            logger.warn('Anti-link aktif tetapi bot bukan admin grup; pesan tidak dapat dihapus.', { chat: m.chat });
          }
          continue;
        }
        if (typeof logger.message === 'function') logger.message({
          chatType: m.isNewsletter ? 'newsletter' : (m.isGroup ? 'group' : 'private'),
          pushName: m.pushName,
          mtype: m.mtype,
          hasText: Boolean(m.body),
          isOwner: ctx.isOwner,
          isAdmin: ctx.isGroupAdmin,
          device: 'WhatsApp'
        });
        await dispatcher.dispatch(ctx);
      } catch (error) {
        logger.error('Gagal memproses pesan WhatsApp.', { messageId: m.id, error });
      }
    }
  };
}

module.exports = { createMessagesUpsertHandler };
