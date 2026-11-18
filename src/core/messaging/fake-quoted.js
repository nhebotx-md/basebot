'use strict';

const { randomBytes } = require('node:crypto');

const FAKE_QUOTED_JID = '13135550002@s.whatsapp.net';

function cleanVCardValue(value, fallback = 'ShooNhee-AI') {
  const cleaned = String(value ?? fallback)
    .replace(/[\\r\\n\\u0000-\\u001f\\u007f-\\u009f]/g, ' ')
    .replace(/\\s{2,}/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

function createFakeQuoted(botName = 'ShooNhee-AI', verified = true, remoteJid = FAKE_QUOTED_JID) {
  const name = cleanVCardValue(botName);
  const destination = typeof remoteJid === 'string' && remoteJid.trim() ? remoteJid.trim() : FAKE_QUOTED_JID;
  return {
    key: {
      id: 'FAKE' + randomBytes(9).toString('hex').toUpperCase(),
      fromMe: false,
      participant: FAKE_QUOTED_JID,
      remoteJid: destination
    },
    message: {
      contactMessage: {
        displayName: verified ? '✅ ' + name : name,
        vcard: 'BEGIN:VCARD\\nVERSION:3.0\\nFN:' + name + '\\nORG:' + (verified ? 'Verified Bot' : 'Bot') + '\\nEND:VCARD'
      }
    },
    messageTimestamp: Math.floor(Date.now() / 1000),
    pushName: name
  };
}

module.exports = { createFakeQuoted, FAKE_QUOTED_JID };
