/**
 * =========================================
 * 📌 FILE: message.js
 * 📌 DESCRIPTION:
 * Utility functions untuk message processing
 * Berbagai helper untuk formatting, time, buffer, dan serialization
 *
 * Berisi:
 * - Time & date utilities
 * - Buffer & media processing
 * - Formatting helpers
 * - Message serialization (smsg)
 * - Group utilities
 *
 * ⚠️ CATATAN:
 * DILARANG mengubah nama variabel/function
 * karena berpengaruh ke sistem global
 * =========================================
 */

// =========================================
// 📌 IMPORT / REQUIRE
// =========================================

// Import dari Baileys library
const { 
    proto, 
    delay, 
    getContentType, 
    areJidsSameUser, 
    generateWAMessage 
} = require("@itsukichan/baileys");

// Import library tambahan
const chalk = require('chalk');
const fs = require('fs');
const Crypto = require('crypto');
const axios = require('axios');
const moment = require('moment-timezone');
const { sizeFormatter } = require('human-readable');
const util = require('util');
const Jimp = require('jimp');
const { defaultMaxListeners } = require('stream');

// =========================================
// 📌 UTILITIES / HELPER FUNCTIONS - TIME
// =========================================

/**
 * =========================================
 * 📌 FUNCTION: unixTimestampSeconds (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Mengkonversi date object ke Unix timestamp dalam detik
 *
 * Parameter:
 * - date → Date object (default: new Date())
 *
 * Return:
 * - Number → Unix timestamp dalam detik
 * =========================================
 */
const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000);

exports.unixTimestampSeconds = unixTimestampSeconds;

/**
 * =========================================
 * 📌 FUNCTION: generateMessageTag (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Generate message tag dengan optional epoch
 *
 * Parameter:
 * - epoch → Optional epoch number
 *
 * Return:
 * - String → Message tag
 * =========================================
 */
exports.generateMessageTag = (epoch) => {
    let tag = (0, exports.unixTimestampSeconds)().toString();
    if (epoch)
        tag += '.--' + epoch; // attach epoch if provided
    return tag;
};

/**
 * =========================================
 * 📌 FUNCTION: processTime (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Hitung selisih waktu dari timestamp
 *
 * Parameter:
 * - timestamp → Timestamp awal
 * - now → Timestamp akhir
 *
 * Return:
 * - Number → Selisih dalam detik
 * =========================================
 */
exports.processTime = (timestamp, now) => {
    return moment.duration(now - moment(timestamp * 1000)).asSeconds();
};

/**
 * =========================================
 * 📌 FUNCTION: getRandom (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Generate random filename dengan extension
 *
 * Parameter:
 * - ext → Extension file (contoh: '.jpg')
 *
 * Return:
 * - String → Random filename
 * =========================================
 */
exports.getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

// =========================================
// 📌 UTILITIES / HELPER FUNCTIONS - BUFFER
// =========================================

/**
 * =========================================
 * 📌 FUNCTION: getBuffer (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Download file dari URL dan return sebagai buffer
 *
 * Parameter:
 * - url → URL file yang akan didownload
 * - options → Optional axios options
 *
 * Return:
 * - Buffer → File buffer atau error
 * =========================================
 */
exports.getBuffer = async (url, options) => {
    try {
        options ? options : {};
        const res = await axios({
            method: "get",
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (err) {
        return err;
    }
};

/**
 * =========================================
 * 📌 FUNCTION: fetchJson (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Fetch JSON data dari URL
 *
 * Parameter:
 * - url → URL API
 * - options → Optional axios options
 *
 * Return:
 * - Object → JSON data atau error
 * =========================================
 */
exports.fetchJson = async (url, options) => {
    try {
        options ? options : {};
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        });
        return res.data;
    } catch (err) {
        return err;
    }
};

// =========================================
// 📌 UTILITIES / HELPER FUNCTIONS - FORMATTING
// =========================================

/**
 * =========================================
 * 📌 FUNCTION: runtime (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Format detik ke format readable (days, hours, minutes, seconds)
 *
 * Parameter:
 * - seconds → Waktu dalam detik
 *
 * Return:
 * - String → Formatted runtime (contoh: "1 day, 2 hours, 30 minutes")
 * =========================================
 */
exports.runtime = function(seconds) {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);
    var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
};

/**
 * =========================================
 * 📌 FUNCTION: clockString (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Format milliseconds ke format jam:menit:detik
 *
 * Parameter:
 * - ms → Waktu dalam milliseconds
 *
 * Return:
 * - String → Formatted time (contoh: "01:30:45")
 * =========================================
 */
exports.clockString = (ms) => {
    let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
    let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
    let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
};

/**
 * =========================================
 * 📌 FUNCTION: sleep (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Delay/pause eksekusi selama ms milliseconds
 *
 * Parameter:
 * - ms → Waktu delay dalam milliseconds
 *
 * Return:
 * - Promise → Resolve setelah delay
 * =========================================
 */
exports.sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * =========================================
 * 📌 FUNCTION: isUrl (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Validasi apakah string adalah URL valid
 *
 * Parameter:
 * - url → String yang akan divalidasi
 *
 * Return:
 * - Boolean/Array → Match result atau null
 * =========================================
 */
exports.isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));
};

// =========================================
// 📌 UTILITIES / HELPER FUNCTIONS - DATE
// =========================================

/**
 * =========================================
 * 📌 FUNCTION: getTime (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Format date ke string dengan format tertentu (timezone Asia/Jakarta)
 *
 * Parameter:
 * - format → Format string (moment.js format)
 * - date → Optional date object (default: now)
 *
 * Return:
 * - String → Formatted date/time
 * =========================================
 */
exports.getTime = (format, date) => {
    if (date) {
        return moment(date).locale('id').format(format);
    } else {
        return moment.tz('Asia/Jakarta').locale('id').format(format);
    }
};

/**
 * =========================================
 * 📌 FUNCTION: formatDate (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Format date ke string locale Indonesia
 *
 * Parameter:
 * - n → Timestamp atau Date object
 * - locale → Locale string (default: 'id')
 *
 * Return:
 * - String → Formatted date
 * =========================================
 */
exports.formatDate = (n, locale = 'id') => {
    let d = new Date(n);
    return d.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    });
};

/**
 * =========================================
 * 📌 FUNCTION: tanggal (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Format timestamp ke format tanggal Indonesia dengan weton
 *
 * Parameter:
 * - numer → Timestamp
 *
 * Return:
 * - String → Formatted date dengan weton Jawa
 * =========================================
 */
exports.tanggal = (numer) => {
    myMonths = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    myDays = ['Minggu','Senin','Selasa','Rabu','Kamis','Jum°at','Sabtu']; 
    var tgl = new Date(numer);
    var day = tgl.getDate();
    bulan = tgl.getMonth();
    var thisDay = tgl.getDay();
    thisDay = myDays[thisDay];
    var yy = tgl.getYear();
    var year = (yy < 1000) ? yy + 1900 : yy; 
    const time = moment.tz('Asia/Jakarta').format('DD/MM HH:mm:ss');
    let d = new Date;
    let locale = 'id';
    let gmt = new Date(0).getTime() - new Date('1 January 1970').getTime();
    let weton = ['Pahing', 'Pon','Wage','Kliwon','Legi'][Math.floor(((d * 1) + gmt) / 84600000) % 5];
    return `${thisDay}, ${day} - ${myMonths[bulan]} - ${year}`;
};

/**
 * =========================================
 * 📌 FUNCTION: formatp (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Format bytes ke human-readable size (JEDEC standard)
 *
 * Return:
 * - Function → Formatter function
 * =========================================
 */
exports.formatp = sizeFormatter({
    std: 'JEDEC', //'SI' = default | 'IEC' | 'JEDEC'
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`,
});

/**
 * =========================================
 * 📌 FUNCTION: jsonformat (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Format object ke JSON string dengan indentasi
 *
 * Parameter:
 * - string → Object yang akan diformat
 *
 * Return:
 * - String → Formatted JSON
 * =========================================
 */
exports.jsonformat = (string) => {
    return JSON.stringify(string, null, 2);
};

/**
 * =========================================
 * 📌 FUNCTION: format (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Wrapper untuk util.format
 *
 * Parameter:
 * - args → Arguments untuk util.format
 *
 * Return:
 * - String → Formatted string
 * =========================================
 */
function format(...args) {
    return util.format(...args);
}

/**
 * =========================================
 * 📌 FUNCTION: logic (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Logic checker untuk mencocokkan value dengan input/output pairs
 *
 * Parameter:
 * - check → Value yang akan dicek
 * - inp → Array input values
 * - out → Array output values
 *
 * Return:
 * - Value dari out yang cocok, atau null
 * =========================================
 */
exports.logic = (check, inp, out) => {
    if (inp.length !== out.length) throw new Error('Input and Output must have same length');
    for (let i in inp)
        if (util.isDeepStrictEqual(check, inp[i])) return out[i];
    return null;
};

/**
 * =========================================
 * 📌 FUNCTION: generateProfilePicture (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Generate profile picture dari buffer gambar
 * Crop dan resize ke ukuran yang sesuai
 *
 * Parameter:
 * - buffer → Buffer gambar
 *
 * Return:
 * - Object → { img, preview } buffers
 * =========================================
 */
exports.generateProfilePicture = async (buffer) => {
    const jimp = await Jimp.read(buffer);
    const min = jimp.getWidth();
    const max = jimp.getHeight();
    const cropped = jimp.crop(0, 0, min, max);
    return {
        img: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG),
        preview: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG)
    };
};

/**
 * =========================================
 * 📌 FUNCTION: bytesToSize (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Konversi bytes ke human-readable size
 *
 * Parameter:
 * - bytes → Ukuran dalam bytes
 * - decimals → Jumlah desimal (default: 2)
 *
 * Return:
 * - String → Formatted size
 * =========================================
 */
exports.bytesToSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * =========================================
 * 📌 FUNCTION: getSizeMedia (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Get ukuran media dari URL atau buffer
 *
 * Parameter:
 * - path → URL atau Buffer
 *
 * Return:
 * - Promise<String> → Formatted size
 * =========================================
 */
exports.getSizeMedia = (path) => {
    return new Promise((resolve, reject) => {
        if (/http/.test(path)) {
            axios.get(path)
            .then((res) => {
                let length = parseInt(res.headers['content-length']);
                let size = exports.bytesToSize(length, 3);
                if(!isNaN(length)) resolve(size);
            });
        } else if (Buffer.isBuffer(path)) {
            let length = Buffer.byteLength(path);
            let size = exports.bytesToSize(length, 3);
            if(!isNaN(length)) resolve(size);
        } else {
            reject('error gatau apah');
        }
    });
};

/**
 * =========================================
 * 📌 FUNCTION: parseMention (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Parse mentions dari text (format @number)
 *
 * Parameter:
 * - text → Text yang mengandung mentions
 *
 * Return:
 * - Array → Array JID yang di-mention
 * =========================================
 */
exports.parseMention = (text = '') => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
};

/**
 * =========================================
 * 📌 FUNCTION: getGroupAdm (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Get daftar admin dari participants group
 * (Note: Nama fungsi typo, harusnya getGroupAdmins)
 *
 * Parameter:
 * - participants → Array participants dari groupMetadata
 *
 * Return:
 * - Array → Array JID admin
 * =========================================
 */
exports.getGroupAdm = (participants) => {
    let admins = [];
    for (let i of participants) {
        i.admin === "superadmin" ? admins.push(i.id) :  i.admin === "admin" ? admins.push(i.id) : '';
    }
    return admins || [];
};

// =========================================
// 📌 CORE LOGIC - MESSAGE SERIALIZATION
// =========================================

/**
 * =========================================
 * 📌 FUNCTION: smsg (JANGAN DIUBAH)
 * -----------------------------------------
 * Deskripsi:
 * Serialize message dari WhatsApp ke format yang lebih mudah digunakan
 *
 * Parameter:
 * - conn → WhatsApp connection instance
 * - m → Message object mentah
 * - store → In-memory store
 *
 * Return:
 * - Object → Serialized message dengan utilities
 *
 * ⚠️ NOTE:
 * Ini adalah core function untuk message handling
 * =========================================
 */
exports.smsg = (conn, m, store) => {
    if (!m) return m;
    let M = proto.WebMessageInfo;
    
    // =========================================
    // PROCESS MESSAGE KEY
    // =========================================
    if (m.key) {
        m.id = m.key.id;
        // Check if message from Baileys
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        // Get sender JID
        m.sender = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '');
        // Get participant for group
        if (m.isGroup) m.participant = conn.decodeJid(m.key.participant) || '';
    }
    
    // =========================================
    // PROCESS MESSAGE CONTENT
    // =========================================
    if (m.message) {
        m.mtype = getContentType(m.message);
        // Handle viewOnceMessage
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype]);
        // Extract body/text
        m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text;
        
        // =========================================
        // PROCESS QUOTED MESSAGES
        // =========================================
        let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null;
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
        
        if (m.quoted) {
            let type = Object.keys(m.quoted)[0];
            m.quoted = m.quoted[type];
            
            // Handle product message
            if (['productMessage'].includes(type)) {
                type = Object.keys(m.quoted)[0];
                m.quoted = m.quoted[type];
            }
            
            // Convert string to object
            if (typeof m.quoted === 'string') m.quoted = {
                text: m.quoted
            };
            
            m.quoted.mtype = type;
            m.quoted.id = m.msg.contextInfo.stanzaId;
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false;
            m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant);
            m.quoted.fromMe = m.quoted.sender === conn.decodeJid(conn.user.id);
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
            
            // Get quoted message object
            m.getQuotedObj = m.getQuotedMessage = async () => {
                if (!m.quoted.id) return false;
                let q = await store.loadMessage(m.chat, m.quoted.id, conn);
                return exports.smsg(conn, q, store);
            };
            
            // Create fake object for quoted
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            });

            // Quoted utilities
            /**
             * Delete quoted message
             */
            m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: vM.key });

            /**
             * Copy and forward quoted message
             */
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => conn.copyNForward(jid, vM, forceForward, options);

            /**
             * Download quoted media
             */
            m.quoted.download = () => conn.downloadMediaMessage(m.quoted);
        }
    }
    
    // Add download helper to message
    if (m.msg.url) m.download = () => conn.downloadMediaMessage(m.msg);
    
    // Set text property
    m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || '';
    
    /**
     * Reply to this message
     */
    m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? conn.sendMedia(chatId, text, 'file', '', m, { ...options }) : conn.sendText(chatId, text, m, { ...options });
    
    /**
     * Copy this message
     */
    m.copy = () => exports.smsg(conn, M.fromObject(M.toObject(m)));

    /**
     * Forward this message
     */
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options);

    // =========================================
    // APPEND TEXT MESSAGE HELPER
    // =========================================
    /**
     * Append text ke message yang sudah ada
     */
    conn.appenTextMessage = async(text, chatUpdate) => {
        let messages = await generateWAMessage(m.chat, { text: text, mentions: m.mentionedJid }, {
            userJid: conn.user.id,
            quoted: m.quoted && m.quoted.fakeObj
        });
        messages.key.fromMe = areJidsSameUser(m.sender, conn.user.id);
        messages.key.id = m.key.id;
        messages.pushName = m.pushName;
        if (m.isGroup) messages.participant = m.sender;
        let msg = {
            ...chatUpdate,
            messages: [proto.WebMessageInfo.fromObject(messages)],
            type: 'append'
        };
        conn.ev.emit('messages.upsert', msg);
    };

    return m;
};
