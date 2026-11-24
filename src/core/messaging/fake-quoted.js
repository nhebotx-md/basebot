'use strict';

const FAKE_QUOTED_JID = '13135550002@s.whatsapp.net';

function createFakeQuoted(botName = 'MUSE-MD', verified = true) {
  return {
    key: {
      fromMe: false,
      participant: '13135550002@s.whatsapp.net',
      remoteJid: '13135550002@s.whatsapp.net'
    },
    message: {
      contactMessage: {
        displayName: verified ? `✅ ${botName}` : botName,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:${verified ? 'Verified Bot' : 'Bot'}\nEND:VCARD`
      }
    }
  };
}

module.exports = { createFakeQuoted, FAKE_QUOTED_JID };
