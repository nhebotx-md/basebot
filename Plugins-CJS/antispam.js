/**
 * Anti Spam Plugin
 * Category: groupmenu
 * Feature: Mendeteksi dan membatasi spam pesan
 */

const fs = require('fs')
const path = require('path')

const ANTISPAM_PATH = path.join(__dirname, '../data/antispam.json')
const SPAM_TRACKER = new Map()

// Load atau buat file antispam
const loadAntispam = () => {
  if (!fs.existsSync(ANTISPAM_PATH)) {
    fs.mkdirSync(path.dirname(ANTISPAM_PATH), { recursive: true })
    fs.writeFileSync(ANTISPAM_PATH, JSON.stringify({}, null, 2))
    return {}
  }
  return JSON.parse(fs.readFileSync(ANTISPAM_PATH, 'utf8'))
}

const saveAntispam = (data) => {
  fs.writeFileSync(ANTISPAM_PATH, JSON.stringify(data, null, 2))
}

// Cek spam
const checkSpam = (userId, groupId, limit = 5, windowMs = 10000) => {
  const key = `${userId}_${groupId}`
  const now = Date.now()
  
  if (!SPAM_TRACKER.has(key)) {
    SPAM_TRACKER.set(key, { count: 1, firstMessage: now, warnings: 0 })
    return { isSpam: false }
  }
  
  const tracker = SPAM_TRACKER.get(key)
  
  // Reset jika sudah lewat window
  if (now - tracker.firstMessage > windowMs) {
    tracker.count = 1
    tracker.firstMessage = now
    return { isSpam: false }
  }
  
  tracker.count++
  
  if (tracker.count > limit) {
    tracker.warnings++
    tracker.count = 0
    tracker.firstMessage = now
    return { isSpam: true, warnings: tracker.warnings }
  }
  
  return { isSpam: false }
}

const handler = async (m, Obj) => {
  const { conn, q, args, isGroup, isBotAdmins, isAdmins, isOwner } = Obj

  if (!isGroup) {
    return conn.sendMessage(m.chat, {
      text: "❌ Fitur ini hanya bisa digunakan di grup!"
    }, { quoted: q('fkontak') })
  }

  if (!isBotAdmins) {
    return conn.sendMessage(m.chat, {
      text: "❌ Bot harus menjadi admin untuk menggunakan fitur ini!"
    }, { quoted: q('fkontak') })
  }

  if (!isAdmins && !isOwner) {
    return conn.sendMessage(m.chat, {
      text: "❌ Hanya admin atau owner yang bisa mengatur antispam!"
    }, { quoted: q('fkontak') })
  }

  const antispamData = loadAntispam()
  const action = args[0]?.toLowerCase()

  if (action === 'on') {
    const limit = parseInt(args[1]) || 5
    const duration = parseInt(args[2]) || 10
    
    antispamData[m.chat] = { 
      enabled: true, 
      limit: limit,
      duration: duration,
      action: 'warn'
    }
    saveAntispam(antispamData)
    
    await conn.sendMessage(m.chat, {
      text: `✅ *Anti Spam Diaktifkan!*\n\n• Limit: ${limit} pesan/${duration} detik\n• Aksi: Peringatan`,
      footer: "© NHE Bot Protection",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📊 Status",
            id: ".antispam status"
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🔴 Matikan",
            id: ".antispam off"
          })
        }
      ]
    }, { quoted: q('fkontak') })

  } else if (action === 'off') {
    delete antispamData[m.chat]
    saveAntispam(antispamData)
    
    await conn.sendMessage(m.chat, {
      text: `❌ *Anti Spam Dinonaktifkan!*`,
      contextInfo: {
        externalAdReply: {
          title: "Anti Spam Disabled",
          body: "Spam protection turned off",
          thumbnailUrl: "https://files.catbox.moe/5x2b8n.jpg",
          renderLargerThumbnail: true
        }
      }
    }, { quoted: q('fkontak') })

  } else if (action === 'status') {
    const status = antispamData[m.chat]?.enabled ? '✅ AKTIF' : '❌ NONAKTIF'
    const limit = antispamData[m.chat]?.limit || 5
    const duration = antispamData[m.chat]?.duration || 10
    
    await conn.sendMessage(m.chat, {
      text: `📊 *Status Anti Spam*\n\n• Status: ${status}\n• Limit: ${limit} pesan/${duration} detik\n• Grup: ${m.chat}`,
      footer: "Anti Spam System",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: antispamData[m.chat]?.enabled ? "🔴 Matikan" : "🟢 Nyalakan",
            id: antispamData[m.chat]?.enabled ? ".antispam off" : ".antispam on"
          })
        }
      ]
    }, { quoted: q('fkontak') })

  } else {
    await conn.sendMessage(m.chat, {
      text: `
╭───〔 *ANTI SPAM MENU* 〕───╮
│
│ 📋 *Cara Penggunaan:*
│
│ • .antispam on [limit] [duration]
│   → Mengaktifkan anti spam
│   → Default: 5 pesan/10 detik
│
│ • .antispam off
│   → Menonaktifkan anti spam
│
│ • .antispam status
│   → Cek status anti spam
│
│ 📌 *Contoh:*
│ .antispam on 5 10
│
╰──────────────────────────╯
      `.trim(),
      footer: "Anti Spam Protection",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🟢 Nyalakan (5/10)",
            id: ".antispam on"
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📊 Status",
            id: ".antispam status"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }
}

// Export untuk digunakan di message handler
handler.checkSpam = checkSpam
handler.loadAntispam = loadAntispam

handler.help = ['antispam']
handler.tags = ['groupmenu']
handler.command = ["antispam", "antispamgc"]
handler.group = true
handler.admin = true
handler.botAdmin = true

module.exports = handler
