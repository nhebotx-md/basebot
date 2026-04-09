/**
 * Plugin: antispam.js
 * Description: Anti spam dengan limit
 * Command: .antispam
 */

const fs = require('fs')
const path = require('path')

const SPAM_PATH = './data/antispam.json'
const LIMIT_PATH = './data/spamlimit.json'

// In-memory spam tracking
const spamTracker = new Map()

const loadAntiSpam = () => {
  if (!fs.existsSync(SPAM_PATH)) {
    fs.mkdirSync(path.dirname(SPAM_PATH), { recursive: true })
    fs.writeFileSync(SPAM_PATH, JSON.stringify({}, null, 2))
    return {}
  }
  return JSON.parse(fs.readFileSync(SPAM_PATH, 'utf8'))
}

const saveAntiSpam = (data) => {
  fs.writeFileSync(SPAM_PATH, JSON.stringify(data, null, 2))
}

const handler = async (m, Obj) => {
  const { conn, q, button, isGroup, isAdmins, isBotAdmins, args } = Obj

  if (!isGroup) {
    return conn.sendMessage(m.chat, {
      text: "❌ Fitur ini hanya bisa digunakan di grup!"
    }, { quoted: q('fkontak') })
  }

  if (!isAdmins && !Obj.isOwner) {
    return conn.sendMessage(m.chat, {
      text: "❌ Hanya admin yang bisa menggunakan fitur ini!"
    }, { quoted: q('fkontak') })
  }

  if (!isBotAdmins) {
    return conn.sendMessage(m.chat, {
      text: "❌ Bot harus menjadi admin untuk menggunakan fitur ini!"
    }, { quoted: q('fkontak') })
  }

  const antispamData = loadAntiSpam()
  const groupId = m.chat
  const currentStatus = antispamData[groupId]?.enabled || false
  const limit = antispamData[groupId]?.limit || 5
  const cooldown = antispamData[groupId]?.cooldown || 10

  // Handle args
  if (args[0]) {
    const action = args[0].toLowerCase()
    
    if (action === 'on') {
      antispamData[groupId] = { 
        enabled: true, 
        limit: limit,
        cooldown: cooldown,
        ...antispamData[groupId] 
      }
      saveAntiSpam(antispamData)
      
      return conn.sendMessage(m.chat, {
        text: `✅ *Anti Spam* telah diaktifkan!\n\n📊 Limit: ${limit} pesan/${cooldown} detik\n⚠️ Member yang spam akan diperingatkan.`
      }, { quoted: q('fkontak') })
    }
    
    if (action === 'off') {
      antispamData[groupId] = { enabled: false, ...antispamData[groupId] }
      saveAntiSpam(antispamData)
      
      return conn.sendMessage(m.chat, {
        text: `❌ *Anti Spam* telah dinonaktifkan!`
      }, { quoted: q('fkontak') })
    }
    
    // Set limit
    if (action === 'limit' && args[1]) {
      const newLimit = parseInt(args[1])
      if (isNaN(newLimit) || newLimit < 1) {
        return conn.sendMessage(m.chat, {
          text: "❌ Limit harus berupa angka positif!"
        }, { quoted: q('fkontak') })
      }
      
      antispamData[groupId] = { limit: newLimit, ...antispamData[groupId] }
      saveAntiSpam(antispamData)
      
      return conn.sendMessage(m.chat, {
        text: `✅ *Limit spam* diatur ke ${newLimit} pesan!`
      }, { quoted: q('fkontak') })
    }
  }

  const statusText = `
╭━━━❰ *ANTI SPAM SETTINGS* ❱━━━╮
┃
┃ 📊 *Status:* ${currentStatus ? '✅ AKTIF' : '❌ NONAKTIF'}
┃ 🔢 *Limit:* ${limit} pesan
┃ ⏱️ *Cooldown:* ${cooldown} detik
┃
┃ 📝 *Deskripsi:*
┃ Sistem akan mendeteksi spam
┃ berdasarkan jumlah pesan
┃ dalam waktu tertentu.
┃
┃ ⚙️ *Cara Penggunaan:*
┃ • .antispam on - Aktifkan
┃ • .antispam off - Matikan
┃ • .antispam limit 5 - Set limit
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

  const buttons = [
    ...button.flow.quickReply(currentStatus ? "❌ Matikan" : "✅ Aktifkan", currentStatus ? ".antispam off" : ".antispam on"),
    ...button.flow.quickReply("🔢 Limit 5", ".antispam limit 5"),
    ...button.flow.quickReply("🔢 Limit 10", ".antispam limit 10"),
    ...button.flow.quickReply("📋 Menu", ".menuplug"),
    ...button.flow.singleSelect("⚙️ Pengaturan", [
      {
        title: "Anti Spam Options",
        rows: [
          { title: "✅ Aktifkan", description: "Aktifkan anti spam", id: ".antispam on" },
          { title: "❌ Matikan", description: "Nonaktifkan anti spam", id: ".antispam off" },
          { title: "🔢 Limit 3", description: "Set limit 3 pesan", id: ".antispam limit 3" },
          { title: "🔢 Limit 5", description: "Set limit 5 pesan", id: ".antispam limit 5" },
          { title: "🔢 Limit 10", description: "Set limit 10 pesan", id: ".antispam limit 10" }
        ]
      }
    ])
  ]

  await button.sendInteractive(statusText, buttons, {
    title: "Anti Spam Control",
    body: `Status: ${currentStatus ? 'Aktif' : 'Nonaktif'} | Limit: ${limit}`,
    thumbnailUrl: global.thumbnail || "https://files.catbox.moe/5x2b8n.jpg"
  })
}

// Helper function untuk cek spam (bisa dipanggil dari handler utama)
handler.checkSpam = (userId, groupId) => {
  const antispamData = loadAntiSpam()
  if (!antispamData[groupId]?.enabled) return { isSpam: false }
  
  const now = Date.now()
  const key = `${userId}_${groupId}`
  const limit = antispamData[groupId]?.limit || 5
  const cooldown = (antispamData[groupId]?.cooldown || 10) * 1000
  
  if (!spamTracker.has(key)) {
    spamTracker.set(key, { count: 1, firstTime: now })
    return { isSpam: false }
  }
  
  const data = spamTracker.get(key)
  
  if (now - data.firstTime > cooldown) {
    spamTracker.set(key, { count: 1, firstTime: now })
    return { isSpam: false }
  }
  
  data.count++
  
  if (data.count > limit) {
    return { isSpam: true, count: data.count }
  }
  
  return { isSpam: false, count: data.count }
}

handler.help = ['antispam']
handler.tags = ['group']
handler.command = ['antispam', 'antispamgc']
handler.group = true
handler.admin = true
handler.botAdmin = true

module.exports = handler
