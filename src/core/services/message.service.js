'use strict';

function createMessageService(client) {
  return Object.freeze({
    sendMessage: (jid, content, options = {}) => client.sendMessage(jid, content, options),
    reply: (message, text, options = {}) => client.sendMessage(message.chat, { text: String(text) }, { quoted: message.raw || message, ...options }),
    react: (message, emoji) => client.sendMessage(message.chat, { react: { text: emoji, key: message.key } }),
    delete: (jid, key) => client.sendMessage(jid, { delete: key })
  });
}

module.exports = { createMessageService };
