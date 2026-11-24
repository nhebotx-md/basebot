'use strict';

const { getIdentityResolver } = require('../services/identity-resolver.service');
const { createMessageService } = require('../services/message.service');
const { createRichMessageService } = require('../services/rich-message.service');

const BAILEYS_PLUGIN_EVENTS = Object.freeze([
  'messages.update',
  'group-participants.update',
  'messages.reaction',
  'presence.update',
  'group.join-request',
  'groups.update',
  'groups.upsert',
  'newsletter.reaction',
  'newsletter.view',
  'newsletter-participants.update',
  'newsletter-settings.update',
  'lid-mapping.update',
  'message-receipt.update',
  'messages.delete',
  'messages.media-update',
  'blocklist.update',
  'settings.update'
]);

function eventChat(event) {
  if (Array.isArray(event)) return event[0]?.key?.remoteJid || event[0]?.id || '';
  return event?.newsletterJid || event?.newsletter_id || event?.remoteJid || event?.id || event?.jid || event?.key?.remoteJid || event?.chat || '';
}

function createBaileysEventDispatcher({ dispatcher, config, registry, logger = console, events = BAILEYS_PLUGIN_EVENTS } = {}) {
  if (!dispatcher || typeof dispatcher.dispatchEvent !== 'function') throw new TypeError('Event dispatcher membutuhkan CommandDispatcher.');
  const allowed = new Set(BAILEYS_PLUGIN_EVENTS);
  const names = [...new Set(events)];
  for (const name of names) if (!allowed.has(name)) throw new TypeError('Event Baileys tidak diizinkan: ' + name);
  let boundClient = null;
  let listeners = new Map();

  async function dispatch(client, eventName, payload) {
    if (eventName === 'lid-mapping.update') getIdentityResolver(client).clear();
    const chat = eventChat(payload);
    const messages = createMessageService(client, { botName: config?.botName || 'MUSE-MD', verified: true });
    const context = {
      client, sock: client, config, registry, logger, chat,
      isGroup: typeof chat === 'string' && chat.endsWith('@g.us'),
      isPrivate: typeof chat === 'string' && (chat.endsWith('@s.whatsapp.net') || chat.endsWith('@lid')),
      isNewsletter: typeof chat === 'string' && chat.endsWith('@newsletter'),
      services: {
        ...messages, config, logger,
        identity: getIdentityResolver(client),
        richMessage: createRichMessageService(messages.sendMessage),
        database: registry?.databaseService || null,
        users: registry?.userService || null,
        groups: registry?.groupService || null
      },
      reply: (text, options) => messages.reply({ chat }, text, options),
      sendMessage: (jid, content, options) => messages.sendMessage(jid, content, options),
      react: (message, emoji) => messages.react(message, emoji)
    };
    return dispatcher.dispatchEvent(eventName, context, payload);
  }

  function bind(client) {
    if (!client?.ev || typeof client.ev.on !== 'function') throw new TypeError('Socket tidak menyediakan event emitter Baileys.');
    if (boundClient === client) return { bound: false, eventCount: listeners.size };
    if (boundClient && typeof boundClient.ev?.off === 'function') {
      for (const [name, listener] of listeners) boundClient.ev.off(name, listener);
    }
    boundClient = client;
    listeners = new Map();
    for (const name of names) {
      const listener = payload => {
        Promise.resolve(dispatch(client, name, payload)).catch(error => {
          logger.error?.('Dispatcher event Baileys gagal.', { eventName: name, errorName: error?.name, errorMessage: error?.message });
        });
      };
      listeners.set(name, listener);
      client.ev.on(name, listener);
    }
    logger.info?.('Event dispatcher Baileys terpasang.', { events: names.length });
    return { bound: true, eventCount: listeners.size };
  }

  function unbind() {
    if (boundClient && typeof boundClient.ev?.off === 'function') {
      for (const [name, listener] of listeners) boundClient.ev.off(name, listener);
    }
    const count = listeners.size;
    listeners = new Map();
    boundClient = null;
    return count;
  }

  return Object.freeze({ bind, unbind, dispatch, get eventNames() { return [...names]; }, get bound() { return Boolean(boundClient); } });
}

module.exports = { BAILEYS_PLUGIN_EVENTS, createBaileysEventDispatcher, eventChat };
