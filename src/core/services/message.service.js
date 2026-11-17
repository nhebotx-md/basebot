'use strict';

const { createFakeQuoted } = require('../messaging/fake-quoted');

function createMessageService(client, { botName = 'ShooNhee-AI', verified = true } = {}) {
  function defaultQuote(jid) {
    return createFakeQuoted(botName, verified, jid);
  }

  function withDefaultQuote(jid, options = {}) {
    if (Object.hasOwn(options, 'quoted')) return options;
    return { ...options, quoted: defaultQuote(jid) };
  }

  return Object.freeze({
    sendMessage: (jid, content, options = {}) => client.sendMessage(jid, content, withDefaultQuote(jid, options)),
    reply: (message, text, options = {}) => {
      const jid = message.chat || message.key?.remoteJid;
      return client.sendMessage(jid, { text: String(text) }, withDefaultQuote(jid, options));
    },
    react: (message, emoji) => client.sendMessage(message.chat, { react: { text: emoji, key: message.key } }),
    delete: (jid, key) => client.sendMessage(jid, { delete: key })
  });
}

module.exports = { createMessageService };
