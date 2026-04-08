console.clear();
require('./config');
const { description, version, name, main } = require("./package.json")
const { 
    default: baileys, 
    downloadContentFromMessage, 
    proto, 
    generateWAMessage, 
    getContentType, 
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    GroupSettingChange,
    areJidsSameUser,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    makeWaSocket,
    makeInMemoryStore,
    useSingleFileAuthState,
    BufferJSON,
    WAFlag,
    ChatModification,
    ReconnectMode,
    ProxyAgent,
    isBaileys,
    DisconnectReason,
    getStream,
    templateMessage
} = require("@itsukichan/baileys");

const fs = require('fs');
const util = require('util');
const chalk = require('chalk');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment-timezone');
const { spawn, exec } = require('child_process');
const babel = require('@babel/core');
const yts = require('yt-search');

// Message utilities
const { 
    smsg, 
    tanggal, 
    getTime, 
    isUrl, 
    sleep, 
    clockString, 
    runtime, 
    fetchJson, 
    getBuffer, 
    jsonformat, 
    format, 
    parseMention, 
    getRandom, 
    getGroupAdm, 
    generateProfilePicture 
} = require('./System/message');

// Config files
const { CatBox, TelegraPh, UploadFileUgu, webp2mp4File, floNime, uptotelegra } = require('./Library/uploader.js')
const SaveTube = require('./Library/savetube') 
const ytdl = new SaveTube()
const Case = require("./Library/system");
const OWNER_PATH = './data/Own.json';
const PREMIUM_PATH = './data/Prem.json';

module.exports = WhosTANG = async (WhosTANG, m, chatUpdate, store) => {
    try {
        // Message type detection
        let body = '';
        const messageTypes = {
            conversation: m.message?.conversation || '[Conversation]',
            imageMessage: m.message?.imageMessage?.caption || '[Image]',
            videoMessage: m.message?.videoMessage?.caption || '[Video]',
            audioMessage: m.message?.audioMessage?.caption || '[Audio]',
            stickerMessage: m.message?.stickerMessage?.caption || '[Sticker]',
            documentMessage: m.message?.documentMessage?.fileName || '[Document]',
            contactMessage: '[Contact]',
            locationMessage: m.message?.locationMessage?.name || '[Location]',
            liveLocationMessage: '[Live Location]',
            extendedTextMessage: m.message?.extendedTextMessage?.text || '[Extended Text]',
            buttonsResponseMessage: m.message?.buttonsResponseMessage?.selectedButtonId || '[Button Response]',
            listResponseMessage: m.message?.listResponseMessage?.singleSelectReply?.selectedRowId || '[List Response]',
            templateButtonReplyMessage: m.message?.templateButtonReplyMessage?.selectedId || '[Template Button Reply]',
            interactiveResponseMessage: '[Interactive Response]',
            pollCreationMessage: '[Poll Creation]',
            reactionMessage: m.message?.reactionMessage?.text || '[Reaction]',
            ephemeralMessage: '[Ephemeral]',
            viewOnceMessage: '[View Once]',
            productMessage: m.message?.productMessage?.product?.name || '[Product]'
        };

        if (m.mtype && messageTypes[m.mtype]) {
            body = messageTypes[m.mtype];
        } else if (m.message?.messageContextInfo) {
            body = m.message.buttonsResponseMessage?.selectedButtonId || 
                   m.message.listResponseMessage?.singleSelectReply?.selectedRowId || 
                   m.text || 
                   '[Message Context]';
        } else {
            body = '[Unknown Type]';
        }

const sender = m.key.fromMe ? WhosTANG.user.id.split(":")[0] + "0@s.whatsapp.net" || WhosTANG.user.id
: m.key.participant || m.key.remoteJid;

const senderNumber = sender.split('@')[0];  
const budy = (typeof m.text === 'string' ? m.text : '');  
const prefa = ["", "!", ".", ",", "🐤", "🗿"];

const prefixRegex = /^[°zZ#$@*+,.?=''():√%!¢£¥€π¤ΠΦ_&><`™©®Δ^βα~¦|/\\©^]/;
const prefix = prefixRegex.test(body) ? body.match(prefixRegex)[0] : ``;
const from = m.key.remoteJid;  
const isGroup = from.endsWith("@g.us");  
const isPrivate = from.endsWith("@s.whatsapp.net");  
      
const premium = JSON.parse(fs.readFileSync("./data/premium.json"))  
const kontributor = JSON.parse(fs.readFileSync('./data/owner.json'));  
const botNumber = await WhosTANG.decodeJid(WhosTANG.user.id);  
const isOwner = [botNumber, ...kontributor, ...global.owner].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)  
const buffer64base = "62881027174423@s.whatsapp.net";  
const isCmd = body?.startsWith(prefix);  
const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';  
const cmd = prefix + command  
const args = (body || '').trim().split(/ +/).slice(1);  
const pushname = m.pushName || "No Name";  
const WhosTANGdev = (m && m.sender && [botNumber, ...global.owner].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)) || false;  
const isPremium = premium.includes(m.sender)  
const text = q = args.join(" ");  
const quoted = m.quoted ? m.quoted : m;  
const mime = (quoted.msg || quoted).mimetype || '';  
const qmsg = (quoted.msg || quoted);  
const isMedia = /image|video|sticker|audio/.test(mime);  
      

const groupMetadata = m?.isGroup ? await WhosTANG.groupMetadata(m.chat).catch(() => ({})) : {};  
const groupName = m?.isGroup ? groupMetadata.subject || '' : '';  
const participants = m?.isGroup ? groupMetadata.participants?.map(p => {  
        let admin = null;  
        if (p.admin === 'superadmin') admin = 'superadmin';  
        else if (p.admin === 'admin') admin = 'admin';  
        return {  
            id: p.id || null,  
            jid: p.jid || null,  
            lid: p.lid || null,  
            admin,  
            full: p  
        };  
    }) || []: [];  
const groupOwner = m?.isGroup ? participants.find(p => p.admin === 'superadmin')?.jid || '' : '';  
const groupAdmins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.jid || p.id);  
const isBotAdmins = m?.isGroup ? groupAdmins.includes(botNumber) : false;  
const isAdmins = m?.isGroup ? groupAdmins.includes(m.sender) : false;  
const isGroupOwner = m?.isGroup ? groupOwner === m.sender : false;  
const senderLid = (() => {  
const p = participants.find(p => p.jid === m.sender);  
        return p?.lid || null;  
    })();

        
        //
        const reply = (teks) => {
  WhosTANG.sendMessage(m.chat, {
    text: teks
  }, { quoted: m })
}
const {
            smsg,
            fetchJson, 
            sleep,
            formatSize,
            randomKarakter
            } = require('./Library/myfunction');
        // Time and date
        const time = moment().tz("Asia/Jakarta").format("HH:mm:ss");
        let ucapanWaktu = "🌆𝐒𝐞𝐥𝐚𝐦𝐚𝐭 𝐒𝐮𝐛𝐮𝐡";
        
        if (time >= "19:00:00" && time < "23:59:59") {
            ucapanWaktu = "🌃𝐒𝐞𝐥𝐚𝐦𝐚𝐭 𝐌𝐚𝐥𝐚𝐦";
        } else if (time >= "15:00:00" && time < "19:00:00") {
            ucapanWaktu = "🌄𝐒𝐞𝐥𝐚𝐦𝐚𝐭 𝐒𝐨𝐫𝐞";
        } else if (time >= "11:00:00" && time < "15:00:00") {
            ucapanWaktu = "🏞️𝐒𝐞𝐥𝐚𝐦𝐚𝐭 𝐒𝐢𝐚𝐧𝐠";
        } else if (time >= "06:00:00" && time < "11:00:00") {
            ucapanWaktu = "🏙️𝐒𝐞𝐥𝐚𝐦𝐚𝐭 𝐏𝐚𝐠𝐢";
        }

        const todayDateWIB = new Date().toLocaleDateString('id-ID', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });


        function convertEsmToCjs(code) {
  let out = code;


  out = out.replace(
    /import\s+([A-Za-z0-9_$]+)\s+from\s+(['"`][^'"`]+['"`]);?/g,
    (m, def, mod) => `const ${def} = require(${mod});`
  );


  out = out.replace(
    /import\s+\{\s*([^}]+)\s*\}\s+from\s+(['"`][^'"`]+['"`]);?/g,
    (m, list, mod) => {

      const mapped = list
        .split(',')
        .map(s => s.trim().replace(/\s+as\s+/i, ': '))
        .join(', ');
      return `const { ${mapped} } = require(${mod});`;
    }
  );


  out = out.replace(
    /import\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s+(['"`][^'"`]+['"`]);?/g,
    (m, name, mod) => `const ${name} = require(${mod});`
  );


  out = out.replace(/import\s+(['"`][^'"`]+['"`]);?/g, (m, mod) => `require(${mod});`);


  out = out.replace(/export\s+default\s+function\s+([A-Za-z0-9_$]*)/g, (m, name) => {
    if (name) return `function ${name}`;
    return 'module.exports = function';
  });
  out = out.replace(/export\s+default\s+class\s+([A-Za-z0-9_$]*)/g, (m, name) => {
    if (name) return `class ${name}`;
    return 'module.exports = class';
  });

  out = out.replace(/export\s+default\s+/g, 'module.exports = ');


  out = out.replace(/export\s+(const|let|var)\s+([A-Za-z0-9_$]+)\s*=/g, (m, kind, name) => {
    return `${kind} ${name} =`;
  });

  const exportVars = [];
  const varRegex = /(?:^|\n)\s*(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=/g;
  let match;

  const originalExportVarRegex = /export\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=/g;
  while ((match = originalExportVarRegex.exec(code))) {
    exportVars.push(match[1]);
  }

  if (exportVars.length) {
    const exportLines = exportVars.map(n => `exports.${n} = ${n};`).join('\n');
    out += '\n\n' + exportLines + '\n';
  }


  out = out.replace(/export\s*\{\s*([^}]+)\s*\}\s*;?/g, (m, list) => {
    return list
      .split(',')
      .map(item => {
        const part = item.trim();
        const asMatch = part.match(/^([A-Za-z0-9_$]+)\s+as\s+([A-Za-z0-9_$]+)$/i);
        if (asMatch) return `exports.${asMatch[2]} = ${asMatch[1]};`;
        return `exports.${part} = ${part};`;
      })
      .join('\n');
  });


  out = out.replace(/export\s+\*\s+from\s+(['"`][^'"`]+['"`]);?/g, (m, mod) => {
    return `Object.assign(exports, require(${mod}));`;
  });


  out = out.replace(/export\s+function\s+([A-Za-z0-9_$]+)\s*\(/g, (m, name) => {
    return `function ${name}(`;
  });
  
  const exportedFuncs = [];
  const funcRegex = /export\s+function\s+([A-Za-z0-9_$]+)\s*\(/g;
  while ((match = funcRegex.exec(code))) exportedFuncs.push(match[1]);
  if (exportedFuncs.length) {
    out += '\n\n' + exportedFuncs.map(n => `exports.${n} = ${n};`).join('\n') + '\n';
  }
  out = out.replace(/\n{3,}/g, '\n\n');

  return out;
}

async function convertWithBabel(sourceCode) {
  const result = await babel.transformAsync(sourceCode, {
    plugins: ['@babel/plugin-transform-modules-commonjs'],
    sourceType: 'module',
    configFile: false,
    babelrc: false,
  });
  return result.code;
}
        const RunTime = `_${runtime(process.uptime())}_`;
        
        const pickRandom = (arr) => {
            return arr[Math.floor(Math.random() * arr.length)];
        };

        if (m.message) {
    const glitchText = (text) => {
        return chalk.hex('#00ffff').bold(text) + chalk.hex('#ff00ff')('_');
    };

    console.log(chalk.bgHex('#0a0a0a').hex('#00ff00')('┌───────────────── 🄼🄴🅂🅂🄰🄶🄴 ─────────────────┐'));
    console.log(chalk.bgHex('#0a0a0a').hex('#ff00ff')(`   ⚡ ${glitchText('INCOMING TRANSMISSION')}`));
    console.log(chalk.bgHex('#0a0a0a').hex('#00ffff')('├─────────────────────────────────────────────┤'));
    
    const entries = [
        ['🕐', 'TIMESTAMP', new Date().toLocaleString()],
        ['📡', 'CONTENT', m.body || m.mtype],
        ['👤', 'USER', pushname],
        ['🔢', 'JID', senderNumber],
        ...(isGroup ? [
            ['👥', 'GROUP', groupName],
            ['🔗', 'GROUP_ID', m.chat]
        ] : [])
    ];

    entries.forEach(([icon, label, value]) => {
        console.log(
            chalk.bgHex('#0a0a0a').hex('#ffff00')(`   ${icon} `) +
            chalk.bgHex('#0a0a0a').hex('#00ff00')(`${label}:`) +
            chalk.bgHex('#0a0a0a').hex('#ffffff')(` ${value}`)
        );
    });
    
    console.log(chalk.bgHex('#0a0a0a').hex('#00ff00')('└─────────────────────────────────────────────┘\n'));
}
const usedPrefix = prefix
const CMD = isCmd
const conn = WhosTANG
const sock = WhosTANG
const isOwn = isOwner
const isPrem = isPremium

// ===== GLOBAL FAKE QUOTED ULTRA =====
const thumbPath = './Tang/image/owner.jpg'
const thumbBuffer = fs.existsSync(thumbPath)
    ? fs.readFileSync(thumbPath)
    : null

global.fakeQuoted = (m, options = {}) => {
    const thumb = thumbBuffer

    const sender = m.sender || '0@s.whatsapp.net'
    const number = sender?.split("@")[0] || "0"
    const name = m.pushName || "User"

    const baseKey = {
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    }
    return {
        fkontak: {
            key: baseKey,
            message: {
                contactMessage: {
                    displayName: global.namaowner || name,
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${global.namaowner || name}\nTEL;waid=${number}:${number}\nEND:VCARD`,
                    jpegThumbnail: thumb
                }
            }
        },

        fvn: {
            key: baseKey,
            message: {
                audioMessage: {
                    mimetype: "audio/ogg; codecs=opus",
                    seconds: 999999,
                    ptt: true
                }
            }
        },

        fgif: {
            key: baseKey,
            message: {
                videoMessage: {
                    caption: options.caption || "Powered by Bot",
                    gifPlayback: true,
                    jpegThumbnail: thumb
                }
            }
        },

        fimg: {
            key: baseKey,
            message: {
                imageMessage: {
                    caption: options.caption || "Fake Image",
                    jpegThumbnail: thumb
                }
            }
        },

        fdoc: {
            key: baseKey,
            message: {
                documentMessage: {
                    title: options.title || "Fake Document",
                    fileName: options.fileName || "file.pdf",
                    mimetype: "application/pdf",
                    jpegThumbnail: thumb
                }
            }
        },

        forder: {
            key: baseKey,
            message: {
                orderMessage: {
                    itemCount: 1,
                    status: 1,
                    surface: 1,
                    message: options.message || "Fake Order",
                    orderTitle: options.title || "Order",
                    thumbnail: thumb,
                    sellerJid: sender
                }
            }
        },

        floc: {
            key: baseKey,
            message: {
                locationMessage: {
                    name: options.name || "Fake Location",
                    jpegThumbnail: thumb
                }
            }
        },

        ftext: {
            key: baseKey,
            message: {
                extendedTextMessage: {
                    text: options.text || "Fake Text Message"
                }
            }
        },

        fproduct: {
            key: baseKey,
            message: {
                productMessage: {
                    product: {
                        productImage: { jpegThumbnail: thumb },
                        title: options.title || "Fake Product",
                        description: options.desc || "Description",
                        currencyCode: "IDR",
                        priceAmount1000: "10000000"
                    },
                    businessOwnerJid: sender
                }
            }
        },

        random: function () {
            const allowed = ['fkontak','fvn','fgif','fimg','fdoc','forder','floc','ftext','fproduct']
            const pick = allowed[Math.floor(Math.random() * allowed.length)]
            return this[pick]
        }
    }
}

global.q = (m, type = 'fkontak', opt = {}) => {
    const data = global.fakeQuoted(m, opt)
    return data[type] || data.fkontak
}
// SELF MODE
if (global.self && !isOwn) return

// Load CJS
const loadPluginsCommand = require("./Library/handler.js")
const handleData = { WhosTANG, text, args, isOwn, isPrem, isCmd, command, reply, conn, sock, quoted, fetchJson, randomKarakter, formatSize, sleep, smsg, isOwner, isPremium, isCmd, prefix, usedPrefix }

if (isCmd) {
  await loadPluginsCommand(m, command, handleData)
}

// Load ESM
if (isCmd) {
  const { default: handleMessage } = await import("./Library/handle.mjs")
  await handleMessage(m, command, handleData)
}
if (global.autoread) {
sock.readMessages([m.key])
}

// Hitung CASE di WhosTANG.js
function countCase(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  const data = fs.readFileSync(filePath, "utf8");
  const match = data.match(/case\s+['"`][^'"`]+['"`]\s*:/g);
  return match ? match.length : 0;
}

// Hitung file di folder (js + mjs)
function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter(f =>
    f.endsWith(".js") || f.endsWith(".mjs")
  ).length;
}

// MAIN FUNCTION
function totalFitur() {
  const CASE = countCase("./WhosTANG.js");
  const ESM = countFiles("./Plugins-ESM");
  const CJS = countFiles("./Plugins-CJS");

  const TOTAL = CASE + ESM + CJS;

  return `CASE : ${CASE}
ESM  : ${ESM}
CJS  : ${CJS}

TOTAL FITUR : ${TOTAL}`;
}

        // =============== COMMAND HANDLER ===============
        switch (command) {
case "developerbot":
case "owner": 
case "own": 
case "dev": {
await sock.sendContact(m.chat, [global.owner], null)
sock.sendMessage(m.chat, {text:`Hai @${m.sender.split("@")[0]} ini adalah owner aku`, contextInfo:{mentionedJid:[m.sender]}}, {quoted:m})
}
break
case 'fitur': 
case 'ttf': 
case 'totalfitur': {
const CASE = countCase("./WhosTANG.js");
const ESM = countFiles("./Plugins-ESM");
const CJS = countFiles("./Plugins-CJS");
const TOTAL = CASE + ESM + CJS;
const tekss = `
CASE : ${CASE}
ESM  : ${ESM}
CJS  : ${CJS}

TOTAL FITUR : ${TOTAL}
`
reply(tekss)
}
break
case "rt": case "runtime": case "uptime": {
reply(RunTime)
}
break
case "ping":
case "speed":
case "pings": {
  let start = Date.now()

  await sock.sendMessage(m.chat, { 
    text: "🏓 Testing speed..." 
  }, { quoted: m })

  let end = Date.now()
  let ping = end - start

  let uptime = process.uptime()
  let up = runtime(uptime)

  let txt = `
⚡ *BOT SPEED TEST*

🏓 Ping: ${ping} ms
🕒 Uptime: ${up}
🚀 Node: ${process.version}
🖥️ Platform: ${process.platform}
  `.trim()

  await sock.sendMessage(m.chat, { text: txt }, { quoted: m })
}
break
case "menu": {
const CASE = countCase("./WhosTANG.js");
const ESM = countFiles("./Plugins-ESM");
const CJS = countFiles("./Plugins-CJS");
const TOTAL = CASE + ESM + CJS;
const menuv = `
╭──────[ *ABOUT BOT* ]──────╮
│▣ Nama-Bot : ${name}
│▣ Version : ${version}
│▣ Runtime : ${runtime(process.uptime())}
│▣ Feature : ${TOTAL} command
│▣ Type : CJS & ESM (Plugins)
╰─────────────────────╯

╭──────[ MAIN ]──────╮
│ ↝ .menu
│ ↝ .ping
│ ↝ .runtime
│ ↝ .totalfitur
│ ↝ .owner
╰────────────────────╯

╭──────[ OWNER ]──────╮
│ ↝ .goodbye on/off
│ ↝ .welcome on/off
│ ↝ .setppbot
│ ↝ .delppbot
│ ↝ .autoread
│ ↝ .self / .public
│ ↝ .backup
│ ↝ .plugin
│ ↝ .addplugin
│ ↝ .delplugin
│ ↝ .listplugin
│ ↝ .getplugin
│ ↝ .addcase
│ ↝ .delcase
│ ↝ .listcase
│ ↝ .getcase
│ ↝ =>
│ ↝ >
│ ↝ $
╰────────────────────╯

╭──────[ GROUP ]──────╮
│ ↝ .promote
│ ↝ .demote
│ ↝ .open
│ ↝ .close
│ ↝ .tagall
│ ↝ .hidetag
│ ↝ .linkgc
│ ↝ .resetlinkgc
│ ↝ .kick
╰────────────────────╯

╭──────[ TOOLS ]──────╮
│ ↝ .case2plugin
│ ↝ .esm2cjs
│ ↝ .cjs2esm
│ ↝ .tourl
│ ↝ .remini
╰────────────────────╯

╭──────[ SEARCH ]──────╮
│ ↝ .spotifyplay
│ ↝ .pin
│ ↝ .play
│ ↝ .ytsearch
╰────────────────────╯

╭──────[ DOWNLOAD ]──────╮
│ ↝ .douyin
│ ↝ .capcut
│ ↝ .threads
│ ↝ .kuaishou
│ ↝ .qq
│ ↝ .espn
│ ↝ .pinterest
│ ↝ .imdb
│ ↝ .imgur
│ ↝ .ifunny
│ ↝ .izlesene
│ ↝ .reddit
│ ↝ .youtube
│ ↝ .twitter
│ ↝ .vimeo
│ ↝ .snapchat
│ ↝ .bilibili
│ ↝ .dailymotion
│ ↝ .sharechat
│ ↝ .likee
│ ↝ .linkedin
│ ↝ .tumblr
│ ↝ .hipi
│ ↝ .telegram
│ ↝ .getstickerpack
│ ↝ .bitchute
│ ↝ .febspot
│ ↝ .9gag
│ ↝ .oke.ru
│ ↝ .rumble
│ ↝ .streamable
│ ↝ .ted
│ ↝ .sohutv
│ ↝ .pornbox
│ ↝ .xvideos
│ ↝ .xnxx
│ ↝ .xiaohongshu
│ ↝ .ixigua
│ ↝ .weibo
│ ↝ .miaopai
│ ↝ .meipai
│ ↝ .xiaoying
│ ↝ .nationalvideo
│ ↝ .yingke
│ ↝ .sina
│ ↝ .bluesky
│ ↝ .soundcloud
│ ↝ .mixcloud
│ ↝ .spotify
│ ↝ .zingmp3
│ ↝ .bandcamp
│ ↝ .download
│ ↝ .tiktok
│ ↝ .instagram
│ ↝ .facebook
│ ↝ .aio
│ ↝ .ytmp3
│ ↝ .ytmp4
╰────────────────────╯
`
WhosTANG.sendMessage(m.chat, {
    text: menuv,
    mentions: [m.sender],
    contextInfo: {
      mentionedJid: [m.sender],
      externalAdReply: {
        title: `${name}`,
        body: `version • ${version}`,
        thumbnailUrl: thumbnail,
        renderLargerThumbnail: true,
        mediaType: 1,
        previewType: 1,
        sourceUrl: ""
      }
    }
  }, { quoted: m })
}
break
/*
########### [ OWNER COMMAND ] #########
*/
case 'welcome':
if (!isOwner) return relply(mess.owner)
global.welcome = args[0] === 'on'
reply('—Welcome ' + (global.welcome ? 'ON' : 'OFF'))
break

case 'goodbye':
if (!isOwner) return relply(mess.owner)
global.goodbye = args[0] === 'on'
reply('—Goodbye ' + (global.goodbye ? 'ON' : 'OFF'))
break
case 'delppbot': {

if (!isOwner) return reply(mess.owner)
await sock.removeProfilePicture(sock.user.id)
reply(`Berhasil Menghapus Gambar Profil Bot`)
}
break
case 'setbotpp':
case 'setppbot': {

if (!isOwner) return relply(mess.owner)
      if (!quoted) return reply(`Kirim/kutip gambar dengan caption ${cmd}`)
      if (!/image/.test(mime)) return reply(`Kirim/kutip gambar dengan caption ${cmd}`)
      if (/webp/.test(mime)) return reply(`Kirim/kutip gambar dengan caption ${cmd}`)
      let media = await sock.downloadAndSaveMediaMessage(quoted)
      await sock.updateProfilePicture(botNumber, {
        url: media
      }).then(() => fs.unlinkSync(media)).catch((err) => fs.unlinkSync(media))
      reply('Sukses mengganti pp bot!')
    }
    break
case 'autoread': {
if (!isOwner) return reply(mess.owner)

if (args[0] === 'on') {
global.autoread = true
reply('✅ Auto Read Message: ON')
} else if (args[0] === 'off') {
global.autoread = false
reply('❌ Auto Read Message: OFF')
} else {
reply(`*Auto Read Status:* ${global.autoread ? 'ON' : 'OFF'}

Contoh:
.autoread on
.autoread off`)
}
}
break
case "self":
  if (!isOwner) return reply(mess.owner)
  global.self = true
  reply("🤖 Bot mode SELF (hanya owner)")
break

case "public":
  if (!isOwner) return reply(mess.owner)
  global.self = false
  reply("🌍 Bot mode PUBLIC (semua user)")
break

 case "getcase": { 
    if (!isOwn) return reply(mess.owner);
    if (!text) return reply("namaCase")
        let hasil = Case.get(text);
        reply(hasil)
}
break;

case "addcase": {
    if (!isOwn) return reply(mess.owner);
    if (!text) return reply(`case "namacase":{ ... }`)
    try {
        Case.add(text);
        reply("✅ Case berhasil ditambahkan.");
    } catch (e) {
        reply(e.message);
    }
}
break;

case "delcase": {
    if (!isOwn) return reply(mess.owner);
    if (!text) return reply("namaCase")
    try {
        Case.delete(text);
        reply(`✅ Case "${text}" berhasil dihapus.`);
    } catch (e) {
        reply(e.message);
    }
}
break;

case "listcase": {
    if (!isOwn) return reply(mess.owner);
    try {
        reply("📜 List Case:\n\n" + Case.list());
    } catch (e) {
        reply(e.message);
    }
}
break;

case "addowner":
case "addown": {

    if (!isOwner) return reply(mess.owner)
    if (!m.quoted && !text) return reply("Contoh: .addowner 6285xxxx")
    let raw = m.quoted 
        ? m.quoted.sender.split("@")[0] 
        : text
    let number = raw.replace(/\D/g, "") 
    if (number.startsWith("0")) {
        number = "62" + number.slice(1)
    }
    if (number.length < 6) return reply("Nomor tidak valid!")

    const jid = number + "@s.whatsapp.net"
    if (owner.includes(jid)) return reply(`Nomor ${number} sudah menjadi owner!`)
    if (jid === botNumber) return reply(`Tidak bisa menambahkan bot sebagai owner!`)
    owner.push(jid)
    fs.writeFileSync("./data/owner.json", JSON.stringify(owner, null, 2))

    reply(`Owner berhasil ditambah: ${number} ✅`)
}
break

case "listowner": case "listown": {
if (!isOwner) return reply(mess.owner)
if (owner.length < 1) return reply("Tidak ada owner tambahan")
let teks = `\n *#- List all owner tambahan*\n`
for (let i of owner) {
teks += `\n* ${i.split("@")[0]}
* *Tag :* @${i.split("@")[0]}\n`
}
sock.sendMessage(m.chat, {text: teks, mentions: owner}, {quoted: m})
}
break

case "delowner": case "delown": {
if (!isOwner) return reply(mess.owner)
if (!m.quoted && !text) return reply("6285###")
const input = m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
const input2 = input.split("@")[0]
if (input2 === global.owner || input == botNumber) return reply(`Tidak bisa menghapus owner utama!`)
if (!owner.includes(input)) return reply(`Nomor ${input2} bukan owner bot!`)
let posi = owner.indexOf(input)
await owner.splice(posi, 1)
await fs.writeFileSync("./data/owner.json", JSON.stringify(owner, null, 2))
reply(`Berhasil menghapus owner ✅`)
}
break


/*
########### [ TOOLS COMMAND ] #########
*/
case 'hd':
case 'tohd':
case 'Enhanced':
case 'remini': {
  if (!quoted) return reply('Fotonya mana?')
  if (!/image/.test(mime)) return reply(`Send/Reply Foto dengan caption ${cmd}`)
  reply('Enhancing foto, tunggu sebentar...')

  try {
    let media = await sock.downloadAndSaveMediaMessage(quoted)
    let kyzoo = await CatBox(media)

    let result = "https://api.deline.web.id/tools/hd?url="+kyzoo
   

    await sock.sendMessage(
      m.chat,
      {
        image: { url: result },
        caption: "sukses meningkatkan kualitas foto"
      },
      { quoted: m }
    )

  } catch (e) {
    console.log(e)
    reply('Terjadi error')
  }
}
break
case 'tourl': {
    if (!quoted) return reply('Reply media (foto/video/file) yang mau di upload!')
    let mime = quoted.mimetype || ''
    if (!mime) return reply('Media tidak valid!')

    reply('⏳ Uploading ke semua platform...')

    let media = await quoted.download()
    let filePath = `./temp_${Date.now()}`

    fs.writeFileSync(filePath, media)

    try {
        let catbox = await CatBox(filePath).catch(e => null)
        let tele = await TelegraPh(filePath).catch(e => null)
        let uguu = await UploadFileUgu(filePath).catch(e => null)
        let flonime = await floNime(media).catch(e => null)

        let hasil = `🌐 *UPLOAD TO URL*\n\n`
        hasil += catbox ? `📦 Catbox:\n${catbox}\n\n` : `📦 Catbox: ERROR\n\n`
        hasil += tele ? `📰 Telegraph:\n${tele}\n\n` : `📰 Telegraph: ERROR\n\n`
        hasil += uguu ? `☁️ Uguu:\n${uguu.url || uguu}\n\n` : `☁️ Uguu: ERROR\n\n`
        hasil += flonime?.url ? `🎨 Flonime:\n${flonime.url}\n\n` : `🎨 Flonime: ERROR\n\n`

        reply(hasil)

    } catch (e) {
        console.log(e)
        reply('Upload gagal ❌')
    } finally {
        fs.unlinkSync(filePath)
    }
}
break
case "case2plugin": {
  let text = args.join(" ") || (quoted && quoted.text)
  if (!text) return reply("Kirim code case atau reply case!")

  function convertCaseToHandler(code) {
    // ambil nama command
    let nameMatch = code.match(/case\s+["'](.+?)["']:/)
    let cmd = nameMatch ? nameMatch[1] : "cmd"

    // ambil isi body
    let body = code
      .replace(/case\s+["'](.+?)["']:\s*/g, "")
      .replace(/break/g, "")
      .trim()

    return `
const handler = async (m, { text, args, reply, sock }) => {
${body}
}

handler.help = ['${cmd}']
handler.tags = ['tools']
handler.command = ["${cmd}"]

module.exports = handler
`
  }

  let result = convertCaseToHandler(text)

  await reply(`✅ *CASE → HANDLER CJS*\n\n\`\`\`js\n${result}\n\`\`\``)
}
break
case "cjs2esm": {
  let text = args.join(" ") || (quoted && quoted.text)
  if (!text) return reply("Kirim kode CJS atau reply file JS!\n\nContoh:\n.cjs2esm const fs = require('fs')")

  function convertCJS(code) {
    let result = code

    // require → import
    result = result.replace(
      /const\s+(\w+)\s*=\s*require\(['"](.+?)['"]\)/g,
      "import $1 from '$2'"
    )

    // module.exports = → export default
    result = result.replace(
      /module\.exports\s*=\s*/g,
      "export default "
    )

    // exports.nama = → export const nama =
    result = result.replace(
      /exports\.(\w+)\s*=\s*/g,
      "export const $1 = "
    )

    return result
  }

  let esmCode = convertCJS(text)

  await reply(`✅ *CJS → ESM Converted*\n\n\`\`\`js\n${esmCode}\n\`\`\``)
}
break
case 'esm2cjs':
case 'esm2cjsfile': {
  // ambil teks dari quoted atau teks command
  const q = m.quoted ? m.quoted : m;
  const text = (q.msg && (q.msg.text || q.msg.caption)) || q.text || '';
  if (!text) return reply('Kirim/quote kode ESM yang ingin di-convert.');

  try {
    // pilih method: quick atau babel
    const useBabel = false; // ganti ke true kalau mau pakai Babel (pastikan dep terinstall)
    let converted;

    if (useBabel) {
      // jika pakai Babel, pastikan require('@babel/core') tersedia
      const babel = require('@babel/core');
      const res = await babel.transformAsync(text, {
        plugins: ['@babel/plugin-transform-modules-commonjs'],
        sourceType: 'module',
        configFile: false,
        babelrc: false,
      });
      converted = res.code;
    } else {
      // pakai converter regex sederhana
      converted = convertEsmToCjs(text); // dari fungsi di atas
    }

    // kirim hasil sebagai file .cjs agar rapi
    const buffer = Buffer.from(converted, 'utf8');
    await sock.sendMessage(m.chat, {
      document: buffer,
      fileName: 'converted.cjs',
      mimetype: 'text/javascript'
    }, { quoted: m });

  } catch (err) {
    console.error(err);
    reply('Gagal convert: ' + err.message);
  }
  break;
}

/*
########### [ SEARCH COMMAND ] #########
*/
             case 'ytplay':
case 'song':
case 'play': {
  if (!text) return reply('Contoh:\n.play Alan Walker Faded')

  const yts = require('yt-search')
  const search = await yts(text)
  if (!search.videos.length) return reply('Video tidak ditemukan')

  const video = search.videos[0]
  reply(`🎵 ${video.title}\n⏳ Downloading...`)

  const res = await ytdl.download(video.url, 'mp3')
  if (!res.status) return reply(res.msg || res.error)

  await sock.sendMessage(m.chat, {
    audio: { url: res.dl },
    mimetype: 'audio/mpeg',
    fileName: `${res.title}.mp3`,
    contextInfo: {
      externalAdReply: {
        title: res.title,
        body: video.author.name,
        thumbnailUrl: res.thumb,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  }, { quoted: m })
}
break
case "ytsearch":
case "youtubesearch":
case "yts": {
    if (!text) return reply("Contoh: .yts kucing")

    const res = await yts(text)
    const videos = res.videos.slice(0, 5)
    if (!videos.length) return reply("Video tidak ditemukan")

    // ==========================
    // BUILD ROWS
    // ==========================
    let rows = []

    for (let v of videos) {
        rows.push(
            {
                title: v.title,
                description: '🎵 Download MP3',
                id: `.ytmp3 ${v.url}`
            },
            {
                title: v.title,
                description: '🎬 Download MP4',
                id: `.ytmp4 ${v.url}`
            }
        )
    }

    // ==========================
    // SEND MESSAGE
    // ==========================
    await sock.sendMessage(m.chat, {
        image: { url: videos[0].thumbnail },
        caption: `🔎 *YouTube Search*\n\nQuery: *${text}*\n\nPilih format download di menu 👇`,
        footer: name,
        viewOnce: true,
        buttons: [
            {
                buttonId: 'ytsearch_menu',
                type: 4,
                buttonText: { displayText: '📥 PILIH VIDEO' },
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: '🎬 YouTube Downloader',
                        description: `Hasil pencarian: ${text}`,
                        sections: [
                            {
                                title: 'Hasil Video',
                                rows
                            }
                        ]
                    })
                }
            }
        ]
    }, { quoted: m })
}
break
/*
########### [ GROUP COMMAND ] #########
*/
case "demote":
case "promote": {

if (!isGroup) return reply(mess.group);
if (!isAdmins && !isOwner) return reply(mess.admin)
if (!isBotAdmins) return reply(mess.botadmin)

if (m.quoted || text) {
var action
let target = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '')+'@s.whatsapp.net'
if (/demote/.test(command)) action = "Demote"
if (/promote/.test(command)) action = "Promote"
await sock.groupParticipantsUpdate(m.chat, [target], action.toLowerCase()).then(async () => {
await sock.sendMessage(m.chat, {text: `Sukses ${action.toLowerCase()} @${target.split("@")[0]}`, mentions: [target]}, {quoted: m})
})
} else {
return reply("@tag/6285###")
}
}
break

case "closegc": case "close": 
case "opengc": case "open": {
if (!isGroup) return reply(mess.group);
if (!isAdmins && !isOwner) return reply(mess.admin)
if (!isBotAdmins) return reply(mess.botadmin)
if (/open|opengc/.test(command)) {
if (groupMetadata.announce == false) return 
await sock.groupSettingUpdate(m.chat, 'not_announcement')
} else if (/closegc|close/.test(command)) {
if (groupMetadata.announce == true) return 
sock.groupSettingUpdate(m.chat, 'announcement')
} else {}
}
break        
case 'tagall':{
if (!isGroup) return reply(mess.group);
if (!isAdmins && !isOwner) return reply(mess.admin)
if (!isBotAdmins) return reply(mess.botadmin)
const textMessage = args.join(" ") || "nothing";
let teks = `—tagall message :\n> *${textMessage}*\n\n`;
const groupMetadata = await sock.groupMetadata(m.chat);
const participants = groupMetadata.participants;
for (let mem of participants) {
teks += `@${mem.id.split("@")[0]}\n`;
}
sock.sendMessage(m.chat, {
text: teks,
mentions: participants.map((a) => a.id)
}, { quoted: m });
}
break         
case "h":
case "hidetag": {
if (!isGroup) return reply(mess.group);
if (!isAdmins && !isOwner) return reply(mess.admin)
if (!isBotAdmins) return reply(mess.botadmin)
if (m.quoted) {
sock.sendMessage(m.chat, {
forward: m.quoted.fakeObj,
mentions: participants.map(a => a.id)
})
}
if (!m.quoted) {
sock.sendMessage(m.chat, {
text: q ? q : '',
mentions: participants.map(a => a.id)
}, { quoted: m })
}
}
break 
case 'kick': {
if (!m.isGroup) return reply(mess.group)
if (!isAdmins && !isOwner) return reply('Khusus Admin!!')
if (!isBotAdmins) return reply('_Bot Harus Menjadi Admin Terlebih Dahulu_')
let users = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '')+'@s.whatsapp.net'
await conn.groupParticipantsUpdate(m.chat, [users], 'remove')
await reply(`*[ Done ]*`)
}
break
case "linkgc": {

if (!isGroup) return reply(mess.group);
if (!isAdmins && !isOwner) return reply(mess.admin)
if (!isBotAdmins) return reply(mess.botadmin)

const urlGrup = "https://chat.whatsapp.com/" + await sock.groupInviteCode(m.chat)
var teks = `
${urlGrup}
`
await sock.sendMessage(m.chat, {text: teks, matchedText: `${urlGrup}`}, {quoted: m})
}

break
case "resetlinkgc": {

if (!isGroup) return reply(mess.group);
if (!isAdmins && !isOwner) return reply(mess.admin)
if (!isBotAdmins) return reply(mess.botadmin)

await sock.groupRevokeInvite(m.chat)
reply("Berhasil mereset link grup ✅")
}

break
/*
########### [ SEARCH COMMAND ] #########
*/
case 'ytmp4': {
  if (!text) return reply('Contoh:\n.ytmp4 link | 720')

  let [link, quality] = text.split('|').map(v => v.trim())
  quality = quality || '360'

  reply(`⏳ Processing MP4 ${quality}p...`)

  const res = await ytdl.download(link, quality)
  if (!res.status) return reply(res.msg || res.error)

  await sock.sendMessage(m.chat, {
    video: { url: res.dl },
    caption: `🎬 ${res.title}\n📺 ${quality}p\n⏱ ${res.duration}`,
    contextInfo: {
      externalAdReply: {
        title: res.title,
        body: `${quality}p`,
        thumbnailUrl: res.thumb,
        mediaType: 2,
        renderLargerThumbnail: true
      }
    }
  }, { quoted: m })
}
break
case 'douyin':
case 'capcut':
case 'threads':
case 'kuaishou':
case 'qq':
case 'espn':
case 'pinterest':
case 'imdb':
case 'imgur':
case 'ifunny':
case 'izlesene':
case 'reddit':
case 'youtube':
case 'twitter':
case 'vimeo':
case 'snapchat':
case 'bilibili':
case 'dailymotion':
case 'sharechat':
case 'likee':
case 'linkedin':
case 'tumblr':
case 'hipi':
case 'telegram':
case 'getstickerpack':
case 'bitchute':
case 'febspot':
case '9gag':
case 'oke.ru':
case 'rumble':
case 'streamable':
case 'ted':
case 'sohutv':
case 'pornbox':
case 'xvideos':
case 'xnxx':
case 'kuaishou':
case 'xiaohongshu':
case 'ixigua':
case 'weibo':
case 'miaopai':
case 'meipai':
case 'xiaoying':
case 'national video':
case 'yingke':
case 'sina':
case 'bluesky':
case 'soundcloud':
case 'mixcloud':
case 'spotify':
case 'zingmp3':
case 'bandcamp':
case 'download':
case 'tiktok':
case 'instagram':
case 'facebook':
case "aio": {
      if (!q) return reply('link Sosmed?')
   try {
    async function fetchInitialPage(initialUrl) {
      try {
        const axios = require('axios')
        const cheerio = require('cheerio')
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.60 Mobile Safari/537.36',
          'Referer': initialUrl,
        }
        const response = await axios.get(initialUrl, { headers })
        const $ = cheerio.load(response.data)
        const csrfToken = $('meta[name="csrf-token"]').attr('content')
        if (!csrfToken) throw new Error('Gagal nemu token keamanan, coba lagi!')
        let cookies = ''
        if (response.headers['set-cookie']) {
          cookies = response.headers['set-cookie'].join('; ')
        }
        return { csrfToken, cookies }
      } catch (error) {
        throw new Error(`Gagal ambil halaman awal: ${error.message}`)
      }
    }
    async function postDownloadRequest(downloadUrl, userUrl, csrfToken, cookies) {
      try {
        const axios = require('axios')
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.60 Mobile Safari/537.36',
          'Referer': 'https://on4t.com/online-video-downloader',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': '*/*',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': cookies
        }
        const postData = new URLSearchParams()
        postData.append('_token', csrfToken)
        postData.append('link[]', userUrl)
        const response = await axios.post(downloadUrl, postData.toString(), { headers })
        if (response.data?.result?.length) {
          return response.data.result.map(item => ({
            title: item.title,
            thumb: item.image,
            url: item.video_file_url || item.videoimg_file_url
          }))
        } else {
          throw new Error('Respons dari server gak sesuai harapan, coba link lain!')
        }
      } catch (error) {
        throw new Error(`Gagal proses permintaan download: ${error.message}`)
      }
    }
    async function sendMediaAutoType(url, title) {
      try {
        const axios = require('axios')
        const { fromBuffer } = require('file-type')   
        const res = await axios.get(url, { responseType: 'arraybuffer' })
        const buff = Buffer.from(res.data)
        const fileInfo = await fromBuffer(buff)
        if (!fileInfo) return reply(`Gagal deteksi tipe file: ${title}`)
        let mime = fileInfo.mime
        let ext = fileInfo.ext
        if (mime.startsWith('video/')) {
          await sock.sendMessage(m.chat, { video: buff, caption: title }, { quoted: m })
        } else if (mime.startsWith('audio/')) {
          await sock.sendMessage(m.chat, { audio: buff, mimetype: mime }, { quoted: m })
        } else if (mime.startsWith('image/')) {
          await sock.sendMessage(m.chat, { image: buff, caption: title }, { quoted: m })
        } else {
          await sock.sendMessage(m.chat, {
            document: buff,
            fileName: `${title}.${ext}`,
            mimetype: mime
          }, { quoted: m })
        }
      } catch (err) {
        reply(`Gagal kirim media: ${err.message}`)
      }
    }
    const initialUrl = 'https://on4t.com/online-video-downloader'
    const downloadUrl = 'https://on4t.com/all-video-download'
    const { csrfToken, cookies } = await fetchInitialPage(initialUrl)
    const results = await postDownloadRequest(downloadUrl, q, csrfToken, cookies)
    for (let i = 0; i < results.length; i++) {
      await sendMediaAutoType(results[i].url, results[i].title)
    }
    await sock.sendMessage(m.chat, { react: { text: '💕', key: m.key } })
  } catch (err) {
    await sock.sendMessage(m.chat, { react: { text: '😳', key: m.key } }) 
    reply(err.message)
  }
break;
}
default: 
                // Eval command for owner (=>)
                if (budy.startsWith('=>') && isOwn) {
                    try {
                        const code = budy.slice(2);
                        const result = await eval(`(async () => { return ${code} })()`);
                        const formattedResult = util.format(result);
                        await m.reply(formattedResult);
                    } catch (error) {
                        await m.reply(`❌ Error:\n${error.message}`);
                    }
                }
                
                // Eval command for owner (>)
                else if (budy.startsWith('>') && isOwn) {
                    try {
                        const code = budy.slice(1);
                        let evaled = await eval(code);
                        if (typeof evaled !== 'string') {
                            evaled = util.inspect(evaled, { depth: 1 });
                        }
                        await m.reply(evaled);
                    } catch (error) {
                        await m.reply(`❌ Error:\n${error.message}`);
                    }
                }
                
                // Shell command for owner ($)
                else if (budy.startsWith('$') && isOwn) {
                    exec(budy.slice(1), (error, stdout, stderr) => {
                        if (error) {
                            return m.reply(`❌ Error:\n${error.message}`);
                        }
                        if (stderr) {
                            return m.reply(`⚠️ stderr:\n${stderr}`);
                        }
                        if (stdout) {
                            return m.reply(`📤 stdout:\n${stdout}`);
                        }
                        return m.reply('✅ Command executed (no output)');
                    });
                }
                break;
        }

    } catch (error) {
        console.error(chalk.red.bold('Error in message handler:'), error);
        
        // Send error message to chat if it's a command error
        if (m && m.chat) {
            try {
                await WhosTANG.sendMessage("0@s.whatsapp.net", {
                    text: `❌ Error occurred:\n${error.message}\n\nPlease contact the bot owner if this persists.`
                }, { quoted: m });
            } catch (sendError) {
                console.error('Failed to send error message:', sendError);
            }
        }
    }
};

// Auto-reload on file changes
const currentFile = __filename;
fs.watchFile(currentFile, () => {
    fs.unwatchFile(currentFile);
    console.log(chalk.green(`✓ ${path.basename(currentFile)} updated! Reloading...`));
    delete require.cache[require.resolve(currentFile)];
});