'use strict';

const { normalizeMessage } = require('../messaging/normalize-message');
const { buildContext } = require('../messaging/context-builder');

function createMessagesUpsertHandler({ dispatcher, config, registry, logger }) {
  return async function onMessagesUpsert(client, chatUpdate, store) {
    for (const raw of chatUpdate?.messages || []) {
      if (!raw?.message || !raw.key?.remoteJid || raw.key.remoteJid === 'status@broadcast') continue;
      if (raw.key.fromMe && chatUpdate.type !== 'notify') continue;
      if (raw.key.id?.startsWith('BAE5') && raw.key.id.length === 16) continue;
      const m = normalizeMessage(raw, client);
      if (!m) continue;
      if (m.isGroup && m.mtype === 'groupStatusMentionMessage') {
        try { await client.sendMessage(m.chat, { delete: m.key }); }
        catch (error) { logger.warn('Gagal menghapus pesan status grup.', { messageId: m.id, error: error.message }); }
        continue;
      }
      if (!m.body && !m.message) continue;
      if (client.public === false && !m.fromMe) continue;
      try {
        const ctx = await buildContext({ client, m, chatUpdate, store, config, registry, logger });
        if (typeof logger.message === 'function') logger.message({
          chatType: m.isGroup ? 'group' : 'private',
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
