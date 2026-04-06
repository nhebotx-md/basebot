console.clear();
require('./config');
const { description, version, name, main } = require("./package.json")
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    makeCacheableSignalKeyStore,
    makeInMemoryStore,
    jidDecode,
    proto,
    getAggregateVotesInPollMessage
} = require("@itsukichan/baileys");
const versi = version
const chalk = require('chalk');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const FileType = require('file-type');
const readline = require("readline");
const PhoneNumber = require('awesome-phonenumber');
const path = require('path');
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, sleep } = require('./System/message.js');

const usePairingCode = true; 

function question(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
};


async function validateUser(phoneNumber) {
    const database = await fetchDatabase(databaseURL);
    return database.includes(phoneNumber);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

//===================
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const WhosTANG = makeWASocket({
        printQRInTerminal: !usePairingCode,
        syncFullHistory: true,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        generateHighQualityLinkPreview: true,
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage
            );
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {},
                            },
                            ...message,
                        },
                    },
                };
            }

            return message;
        },
        version: [99963, 950125916, 0],
        logger: pino({
            level: 'silent' // Set 'fatal' for production
        }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino().child({
                level: 'silent',
                stream: 'store'
            })),
        }
    });

 if (!WhosTANG.authState.creds.registered) {
        
        const phoneNumber = await question(chalk.blue(`Enter Your Number\nYour Number: `));
       
        const code = await WhosTANG.requestPairingCode(phoneNumber, "KYZOOYMD");
        console.log(chalk.green(`\nCode: ${code}`));
    }

    const store = makeInMemoryStore({
        logger: pino({ level: 'silent' }).child({ stream: 'store' })
    });

    store.bind(WhosTANG.ev);

    //===================
    WhosTANG.ev.on('call', async (caller) => {
        console.log("CALL OUTGOING");
    });

    WhosTANG.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        } else return jid;
    };

    WhosTANG.ev.on('messages.upsert', async chatUpdate => {
        try {
            mek = chatUpdate.messages[0];
            if (!mek.message) return;
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
            if (mek.key && mek.key.remoteJid === 'status@broadcast') return;
            if (!WhosTANG.public && !mek.key.fromMe && chatUpdate.type === 'notify') return;
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;
            let m = smsg(WhosTANG, mek, store);
            require("./WhosTANG")(WhosTANG, m, chatUpdate, store);
        } catch (error) {
            console.error("Error processing message upsert:", error);
        }
    });

    WhosTANG.getFile = async (PATH, save) => {
        let res;
        let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0);
        let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' };
        filename = path.join(__filename, '../' + new Date * 1 + '.' + type.ext);
        if (data && save) fs.promises.writeFile(filename, data);
        return { res, filename, size: await getSizeMedia(data), ...type, data };
    };

    WhosTANG.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    };
    
    const GroupParticipants = require('./Library/participants')

WhosTANG.ev.on("group-participants.update", async (m) => {
  await GroupParticipants(WhosTANG, m)
})

    WhosTANG.sendText = (jid, text, quoted = '', options) => WhosTANG.sendMessage(jid, { text, ...options }, { quoted });

    WhosTANG.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        let buffer = options && (options.packname || options.author) ? await writeExifImg(buff, options) : await imageToWebp(buff);
        await WhosTANG.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted });
        return buffer;
    };

    WhosTANG.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        let buffer = options && (options.packname || options.author) ? await writeExifVid(buff, options) : await videoToWebp(buff);
        await WhosTANG.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted });
        return buffer;
    };
WhosTANG.downloadMediaMessage = async (message) => {
      let mime = (message.msg || message).mimetype || ''
      let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
      const stream = await downloadContentFromMessage(message, messageType)
      let buffer = Buffer.from([])
      for await(const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk])}
      return buffer
  }
    WhosTANG.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message;
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(quoted, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        let type = await FileType.fromBuffer(buffer);
        let trueFileName = attachExtension ? (filename + '.' + type.ext) : filename;
        await fs.writeFileSync(trueFileName, buffer);
        return trueFileName;
    };
WhosTANG.sendContact = async (jid, kon, quoted = '', opts = {}) => {
  let list = []

  for (let i of kon) {
    list.push({
      displayName: global.namaown || 'KyzoYamada',
      vcard: `BEGIN:VCARD
VERSION:3.0
N:;;;; 
FN:${global.namaown || 'Kyzo yamada'}
TEL;type=Ponsel;waid=${i}:${i}
X-WA-BIZ-NAME:${global.namaown || 'rizky'}
X-WA-BIZ-DESCRIPTION:Owner ${name}
END:VCARD`
    })
  }

  await WhosTANG.sendMessage(
    jid,
    {
      contacts: {
        displayName: `${list.length} Kontak Bisnis`,
        contacts: list
      },
      contextInfo: {
        externalAdReply: {
          title: name,
          body: `Version • ${versi}`,
          thumbnailUrl: thumbnail,
          sourceUrl: "",
          mediaType: 1,
          renderLargerThumbnail: true,
          showAdAttribution: false
        }
      },
      ...opts
    },
    { quoted }
  )
}
    // Tambahan fungsi send media
    WhosTANG.sendMedia = async (jid, path, caption = '', quoted = '', options = {}) => {
        let { mime, data } = await WhosTANG.getFile(path, true);
        let messageType = mime.split('/')[0];
        let messageContent = {};
        
        if (messageType === 'image') {
            messageContent = { image: data, caption: caption, ...options };
        } else if (messageType === 'video') {
            messageContent = { video: data, caption: caption, ...options };
        } else if (messageType === 'audio') {
            messageContent = { audio: data, ptt: options.ptt || false, ...options };
        } else {
            messageContent = { document: data, mimetype: mime, fileName: options.fileName || 'file' };
        }

        await WhosTANG.sendMessage(jid, messageContent, { quoted });
    };

    WhosTANG.sendPoll = async (jid, question, options) => {
        const pollMessage = {
            pollCreationMessage: {
                name: question,
                options: options.map(option => ({ optionName: option })),
                selectableCount: 1,
            },
        };

        await WhosTANG.sendMessage(jid, pollMessage);
    };

    WhosTANG.public = true;

    WhosTANG.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            WhosTANG.newsletterFollow("120363402508663272@newsletter")
            WhosTANG.newsletterFollow("120363423625415506@newsletter")      
            WhosTANG.newsletterFollow("120363424163797384@newsletter")
        }
    });

    WhosTANG.ev.on('error', (err) => {
        console.error(chalk.red("Error: "), err.message || err);
    });

    WhosTANG.ev.on('creds.update', saveCreds);
}
connectToWhatsApp();