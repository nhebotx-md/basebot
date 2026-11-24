'use strict';

const { createFakeQuoted } = require('../messaging/fake-quoted');

function createMessageService(client, { botName = 'MUSE-MD', verified = true, commandQuote = '' } = {}) {
  const commandHeader = commandQuote ? '> ' + String(commandQuote).replace(/[\r\n]/g, '').trim() : '';

  function formatCommandContent(content) {
    if (!commandHeader || !content || typeof content !== 'object' || Array.isArray(content)) return content;
    const formatted = { ...content };
    for (const field of ['text', 'caption']) {
      if (typeof formatted[field] === 'string' && !formatted[field].startsWith(commandHeader)) {
        formatted[field] = commandHeader + '\n\n' + formatted[field];
      }
    }
    return formatted;
  }
  function defaultQuote(jid) {
    return createFakeQuoted(botName, verified);
  }

  function withDefaultQuote(jid, options = {}) {
    if (Object.hasOwn(options, 'quoted')) return options;
    return { ...options, quoted: defaultQuote(jid) };
  }

  return Object.freeze({
    sendMessage: (jid, content, options = {}) => client.sendMessage(jid, formatCommandContent(content), withDefaultQuote(jid, options)),
    reply: (message, text, options = {}) => {
      const jid = message.chat || message.key?.remoteJid;
      return client.sendMessage(jid, formatCommandContent({ text: String(text) }), withDefaultQuote(jid, options));
    },
    react: (message, emoji) => client.sendMessage(message.chat, { react: { text: emoji, key: message.key } }),
    delete: (jid, key) => client.sendMessage(jid, { delete: key })
  });
}

module.exports = { createMessageService };
