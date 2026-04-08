/**
 * Anti Link Plugin
 * Category: groupmenu
 * Feature: Mendeteksi dan menghapus pesan yang mengandung link
 */

const fs = require('fs')
const path = require('path')

const ANTILINK_PATH = path.join(__dirname, '../data/antilink.json')

// Load atau buat file antilink
const loadAntilink = () => {
  if (!fs.existsSync(ANTILINK_PATH)) {
    fs.mkdirSync(path.dirname(ANTILINK_PATH), { recursive: true })
    fs.writeFileSync(ANTILINK_PATH, JSON.stringify({}, null, 2))
    return {}
  }
  return JSON.parse(fs.readFileSync(ANTILINK_PATH, 'utf8'))
}

const saveAntilink = (data) => {
  fs.writeFileSync(ANTILINK_PATH, JSON.stringify(data, null, 2))
}

// Deteksi link dalam teks
const detectLink = (text) => {
  const linkPatterns = [
    /https?:\/\/\S+/gi,
    /www\.\S+/gi,
    /(wa\.me|whatsapp\.com)\/\S+/gi,
    /(t\.me|telegram\.me)\/\S+/gi,
    /(chat\.whatsapp\.com\/\S+)/gi,
    /(youtube\.com|youtu\.be)\/\S+/gi,
    /(facebook\.com|fb\.me)\/\S+/gi,
    /(instagram\.com)\/\S+/gi,
    /(tiktok\.com)\/\S+/gi,
    /(twitter\.com|x\.com)\/\S+/gi
  ]
  
  for (const pattern of linkPatterns) {
    if (pattern.test(text)) return true
  }
  return false
}

const handler = async (m, Obj) => {
  const { conn, q, args, isGroup, isBotAdmins, isAdmins, isOwner, reply } = Obj

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
      text: "❌ Hanya admin atau owner yang bisa mengatur antilink!"
    }, { quoted: q('fkontak') })
  }

  const antilinkData = loadAntilink()
  const action = args[0]?.toLowerCase()

  if (action === 'on') {
    antilinkData[m.chat] = { enabled: true, mode: 'delete' }
    saveAntilink(antilinkData)
    
    // Kirim dengan button
    await conn.sendMessage(m.chat, {
      text: `✅ *Anti Link Diaktifkan!*\n\nBot akan otomatis menghapus pesan yang mengandung link.`,
      footer: "© NHE Bot Protection",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🔧 Set Mode",
            id: ".antilink mode"
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Status",
            id: ".antilink status"
          })
        }
      ]
    }, { quoted: q('fkontak') })

  } else if (action === 'off') {
    delete antilinkData[m.chat]
    saveAntilink(antilinkData)
    
    await conn.sendMessage(m.chat, {
      text: `❌ *Anti Link Dinonaktifkan!*\n\nPesan dengan link tidak akan dihapus lagi.`,
      contextInfo: {
        externalAdReply: {
          title: "Anti Link Disabled",
          body: "Protection turned off",
          thumbnailUrl: "https://files.catbox.moe/5x2b8n.jpg",
          renderLargerThumbnail: true
        }
      }
    }, { quoted: q('fkontak') })

  } else if (action === 'status') {
    const status = antilinkData[m.chat]?.enabled ? '✅ AKTIF' : '❌ NONAKTIF'
    const mode = antilinkData[m.chat]?.mode || 'delete'
    
    await conn.sendMessage(m.chat, {
      text: `📊 *Status Anti Link*\n\n• Status: ${status}\n• Mode: ${mode}\n• Grup: ${m.chat}`,
      footer: "Anti Link System",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: antilinkData[m.chat]?.enabled ? "🔴 Matikan" : "🟢 Nyalakan",
            id: antilinkData[m.chat]?.enabled ? ".antilink off" : ".antilink on"
          })
        }
      ]
    }, { quoted: q('fkontak') })

  } else {
    // Menu bantuan
    await conn.sendMessage(m.chat, {
      text: `
╭───〔 *ANTI LINK MENU* 〕───╮
│
│ 📋 *Cara Penggunaan:*
│
│ • .antilink on
│   → Mengaktifkan anti link
│
│ • .antilink off
│   → Menonaktifkan anti link
│
│ • .antilink status
│   → Cek status anti link
│
│ ⚠️ *Catatan:*
│ Bot harus admin grup!
│
╰──────────────────────────╯
      `.trim(),
      footer: "Anti Link Protection",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🟢 Nyalakan",
            id: ".antilink on"
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📊 Status",
            id: ".antilink status"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }
}

// Export untuk digunakan di message handler
handler.detectLink = detectLink
handler.loadAntilink = loadAntilink

handler.help = ['antilink']
handler.tags = ['groupmenu']
handler.command = ["antilink", "antilinkgc"]
handler.group = true
handler.admin = true
handler.botAdmin = true

module.exports = handler
