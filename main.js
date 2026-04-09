/**
 * =========================================
 * 📌 FILE: main.js
 * 📌 DESCRIPTION:
 * File utama entry point untuk koneksi bot WhatsApp
 *
 * Berisi:
 * - Inisialisasi koneksi WhatsApp menggunakan Baileys
 * - Autentikasi dengan pairing code
 * - Event handlers (messages, connection, calls)
 * - Media download & send utilities
 * - Group participants handler
 *
 * ⚠️ CATATAN:
 * DILARANG mengubah nama variabel/function
 * karena berpengaruh ke sistem global
 * =========================================
 */

// =========================================
// 📌 CLEAR CONSOLE & INITIAL SETUP
// =========================================
console.clear();

// =========================================
// 📌 IMPORT / REQUIRE
// =========================================

// Load konfigurasi global terlebih dahulu
require('./config');

// Import package.json untuk metadata
const { description, version, name, main } = require("./package.json");

// Import fungsi-fungsi dari Baileys library
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

// Import library tambahan
const versi = version;
const chalk = require('chalk');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const FileType = require('file-type');
const readline = require("readline");
const PhoneNumber = require('awesome-phonenumber');
const path = require('path');

// Import utility functions dari System/message.js
const { 
    smsg, 
    isUrl, 
    generateMessageTag, 
    getBuffer, 
    getSizeMedia, 
    fetchJson, 
    sleep 
} = require('./System/message.js');

// =========================================
// 📌 GLOBAL VARIABLES / CONFIG
// =========================================

// Flag untuk menggunakan pairing code (true) atau QR code (false)
const usePairingCode = true;

// =========================================
// 📌 UTILITIES / HELPER FUNCTIONS
// =========================================

/**
 * =========================================
 * 📌 FUNCTION: question (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Fungsi helper untuk membaca input dari terminal/command line
 *
 * Parameter:
 * - query → Pertanyaan yang ditampilkan ke user
 *
 * Digunakan oleh:
 * - connectToWhatsApp() untuk meminta nomor telepon
 *
 * ⚠️ NOTE:
 * Jangan ubah isi function ini
 * =========================================
 */
function question(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}

/**
 * =========================================
 * 📌 FUNCTION: validateUser (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Fungsi untuk validasi user berdasarkan nomor telepon
 * Mengecek apakah nomor terdaftar di database
 *
 * Parameter:
 * - phoneNumber → Nomor telepon yang akan divalidasi
 *
 * Return:
 * - Boolean → true jika terdaftar, false jika tidak
 *
 * ⚠️ NOTE:
 * Jangan ubah isi function ini
 * =========================================
 */
async function validateUser(phoneNumber) {
    const database = await fetchDatabase(databaseURL);
    return database.includes(phoneNumber);
}

// =========================================
// 📌 READLINE INTERFACE (UNUSED)
// =========================================
// Interface readline global (tidak digunakan tapi dipertahankan)
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// =========================================
// 📌 CORE LOGIC / MAIN FUNCTIONS
// =========================================

/**
 * =========================================
 * 📌 FUNCTION: connectToWhatsApp (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Fungsi utama untuk menghubungkan bot ke WhatsApp
 * Menggunakan Baileys library dengan multi-file auth state
 *
 * Fitur:
 * - Autentikasi dengan pairing code atau QR
 * - Message handling & processing
 * - Media download utilities
 * - Connection event handlers
 * - Group participants handler
 *
 * ⚠️ NOTE:
 * Jangan ubah isi function ini - ini adalah core sistem
 * =========================================
 */
async function connectToWhatsApp() {
    
    // =========================================
    // AUTH STATE SETUP
    // =========================================
    // Load atau buat auth state dari folder "./session"
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    
    // =========================================
    // WHATSAPP SOCKET CREATION
    // =========================================
    // Membuat instance WhatsApp socket dengan konfigurasi
    const WhosTANG = makeWASocket({
        // Tampilkan QR di terminal jika tidak pakai pairing code
        printQRInTerminal: !usePairingCode,
        // Sinkronisasi full history
        syncFullHistory: true,
        // Status online saat connect
        markOnlineOnConnect: true,
        // Timeout koneksi
        connectTimeoutMs: 60000,
        // Default query timeout (0 = unlimited)
        defaultQueryTimeoutMs: 0,
        // Interval keep alive
        keepAliveIntervalMs: 10000,
        // Generate high quality link preview
        generateHighQualityLinkPreview: true,
        // Patch message sebelum kirim (untuk buttons, template, list)
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
        // Versi Baileys (custom version)
        version: [99963, 950125916, 0],
        // Logger dengan level silent
        logger: pino({
            level: 'silent' // Set 'fatal' for production
        }),
        // Auth credentials dan keys
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino().child({
                level: 'silent',
                stream: 'store'
            })),
        }
    });

    // =========================================
    // PAIRING CODE SETUP
    // =========================================
    // Jika belum terdaftar, minta pairing code
    if (!WhosTANG.authState.creds.registered) {
        const phoneNumber = await question(chalk.blue(`Enter Your Number\nYour Number: `));
        const code = await WhosTANG.requestPairingCode(phoneNumber, "KYZOOYMD");
        console.log(chalk.green(`\nCode: ${code}`));
    }

    // =========================================
    // IN-MEMORY STORE SETUP
    // =========================================
    // Membuat store untuk menyimpan data chat
    const store = makeInMemoryStore({
        logger: pino({ level: 'silent' }).child({ stream: 'store' })
    });
    
    // Bind store ke event emitter
    store.bind(WhosTANG.ev);

    // =========================================
    // 📌 EVENT HANDLERS
    // =========================================

    // -----------------------------------------
    // CALL EVENT HANDLER
    // -----------------------------------------
    WhosTANG.ev.on('call', async (caller) => {
        console.log("CALL OUTGOING");
    });

    // -----------------------------------------
    // DECODE JID HELPER
    // -----------------------------------------
    /**
     * Decode JID (WhatsApp ID) dari berbagai format
     * Mengubah format :xxx@s.whatsapp.net ke format standar
     */
    WhosTANG.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        } else return jid;
    };

    // -----------------------------------------
    // MESSAGE UPSERT HANDLER
    // -----------------------------------------
    // Handler untuk pesan masuk (baru atau update)
    WhosTANG.ev.on('messages.upsert', async chatUpdate => {
        try {
            // Ambil pesan pertama dari update
            mek = chatUpdate.messages[0];
            // Skip jika tidak ada message
            if (!mek.message) return;
            // Handle ephemeral message
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
            // Skip status broadcast
            if (mek.key && mek.key.remoteJid === 'status@broadcast') return;
            // Skip jika public mode off dan bukan dari bot
            if (!WhosTANG.public && !mek.key.fromMe && chatUpdate.type === 'notify') return;
            // Skip pesan dari Baileys sendiri
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;
            // Serialize message
            let m = smsg(WhosTANG, mek, store);
            // Panggil handler utama (WhosTANG.js)
            require("./WhosTANG")(WhosTANG, m, chatUpdate, store);
        } catch (error) {
            console.error("Error processing message upsert:", error);
        }
    });

    // -----------------------------------------
    // GET FILE HELPER
    // -----------------------------------------
    /**
     * Get file dari berbagai sumber (buffer, URL, path)
     * Return object dengan informasi file
     */
    WhosTANG.getFile = async (PATH, save) => {
        let res;
        // Parse PATH menjadi buffer
        let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0);
        // Detect file type
        let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' };
        // Generate filename
        filename = path.join(__filename, '../' + new Date * 1 + '.' + type.ext);
        // Save file jika diminta
        if (data && save) fs.promises.writeFile(filename, data);
        return { res, filename, size: await getSizeMedia(data), ...type, data };
    };

    // -----------------------------------------
    // DOWNLOAD MEDIA MESSAGE HELPER
    // -----------------------------------------
    /**
     * Download media dari pesan WhatsApp
     * Return buffer dari media
     */
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

    // =========================================
    // 📌 FEATURE HANDLERS
    // =========================================

    // -----------------------------------------
    // GROUP PARTICIPANTS HANDLER
    // -----------------------------------------
    // Import dan setup handler untuk event group participants
    const GroupParticipants = require('./Library/participants');
    
    WhosTANG.ev.on("group-participants.update", async (m) => {
        await GroupParticipants(WhosTANG, m);
    });

    // -----------------------------------------
    // SEND TEXT HELPER
    // -----------------------------------------
    WhosTANG.sendText = (jid, text, quoted = '', options) => WhosTANG.sendMessage(jid, { text, ...options }, { quoted });

    // -----------------------------------------
    // SEND IMAGE AS STICKER
    // -----------------------------------------
    WhosTANG.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        let buffer = options && (options.packname || options.author) ? await writeExifImg(buff, options) : await imageToWebp(buff);
        await WhosTANG.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted });
        return buffer;
    };

    // -----------------------------------------
    // SEND BUTTON HELPER
    // -----------------------------------------
    // Tambahan untuk button support
    WhosTANG.sendButton = (jid, text, buttons = [], quoted = null) => {
        return WhosTANG.sendMessage(jid, { text, buttons, headerType: 1 }, { quoted });
    };

    // -----------------------------------------
    // SEND VIDEO AS STICKER
    // -----------------------------------------
    WhosTANG.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        let buffer = options && (options.packname || options.author) ? await writeExifVid(buff, options) : await videoToWebp(buff);
        await WhosTANG.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted });
        return buffer;
    };

    // -----------------------------------------
    // DOWNLOAD MEDIA MESSAGE (DUPLICATE - DIPERTAHANKAN)
    // -----------------------------------------
    // Note: Ini adalah duplikat dari fungsi di atas, dipertahankan untuk kompatibilitas
    WhosTANG.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    };

    // -----------------------------------------
    // DOWNLOAD AND SAVE MEDIA MESSAGE
    // -----------------------------------------
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

    // -----------------------------------------
    // SEND CONTACT
    // -----------------------------------------
    WhosTANG.sendContact = async (jid, kon, quoted = '', opts = {}) => {
        let list = [];
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
            });
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
        );
    };

    // -----------------------------------------
    // SEND MEDIA HELPER
    // -----------------------------------------
    WhosTANG.sendMedia = async (jid, path, caption = '', quoted = '', options = {}) => {
        let { mime, data } = await WhosTANG.getFile(path, true);
        let messageType = mime.split('/')[0];
        let messageContent = {};
        
        // Tentukan tipe konten berdasarkan mime type
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

    // -----------------------------------------
    // SEND POLL HELPER
    // -----------------------------------------
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

    // =========================================
// 📌 CONNECTION EVENT HANDLERS
    // =========================================

    // Set public mode
    WhosTANG.public = true;

    // -----------------------------------------
    // CONNECTION UPDATE HANDLER
    // -----------------------------------------
    WhosTANG.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            // Reconnect jika bukan logout
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            // Follow newsletter saat koneksi terbuka
            WhosTANG.newsletterFollow("120363402508663272@newsletter");
            WhosTANG.newsletterFollow("120363423625415506@newsletter");
            WhosTANG.newsletterFollow("120363424163797384@newsletter");
        }
    });

    // -----------------------------------------
    // ERROR HANDLER
    // -----------------------------------------
    WhosTANG.ev.on('error', (err) => {
        console.error(chalk.red("Error: "), err.message || err);
    });

    // -----------------------------------------
    // CREDS UPDATE HANDLER
    // -----------------------------------------
    // Simpan credentials saat ada update
    WhosTANG.ev.on('creds.update', saveCreds);
}

// =========================================
// 📌 START APPLICATION
// =========================================
// Jalankan fungsi utama
connectToWhatsApp();
