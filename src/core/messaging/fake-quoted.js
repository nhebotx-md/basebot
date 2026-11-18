'use strict';

const FAKE_QUOTED_JID = '13135550002@s.whatsapp.net';

function createFakeQuoted(botName = 'ShooNhee-AI', verified = true) {
  return {
    key: {
      fromMe: false,
      participant: '13135550002@s.whatsapp.net',
      remoteJid: '13135550002@s.whatsapp.net'
    },
    message: {
      contactMessage: {
        displayName: verified ? \`✅ \${botName}\` : botName,
        vcard: \`BEGIN:VCARD
VERSION:3.0
FN:\${botName}
ORG:\${verified ? 'Verified Bot' : 'Bot'}
END:VCARD\`
      }
    }
  };
}

module.exports = { createFakeQuoted, FAKE_QUOTED_JID };
