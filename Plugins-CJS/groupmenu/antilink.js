/**
 * Plugin: antilink.js
 * Description: Anti link dengan button control
 * Command: .antilink
 */

const fs = require('fs')
const path = require('path')

const ANTI_LINK_PATH = './data/antilink.json'

// Load antilink data
const loadAntiLink = () => {
  if (!fs.existsSync(ANTI_LINK_PATH)) {
    fs.mkdirSync(path.dirname(ANTI_LINK_PATH), { recursive: true })
    fs.writeFileSync(ANTI_LINK_PATH, JSON.stringify({}, null, 2))
    return {}
  }
  return JSON.parse(fs.readFileSync(ANTI_LINK_PATH, 'utf8'))
}

// Save antilink data
const saveAntiLink = (data) => {
  fs.writeFileSync(ANTI_LINK_PATH, JSON.stringify(data, null, 2))
}

const handler = async (m, Obj) => {
  const { conn, q, button, isGroup, isAdmins, isBotAdmins, args, text } = Obj

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

  const antilinkData = loadAntiLink()
  const groupId = m.chat
  const currentStatus = antilinkData[groupId]?.enabled || false

  // Jika ada argumen on/off
  if (args[0]) {
    const action = args[0].toLowerCase()
    
    if (action === 'on') {
      antilinkData[groupId] = { enabled: true, mode: 'delete', ...antilinkData[groupId] }
      saveAntiLink(antilinkData)
      
      return conn.sendMessage(m.chat, {
        text: `✅ *Anti Link* telah diaktifkan di grup ini!\n\n⚠️ Member yang mengirim link akan dihapus pesannya.`
      }, { quoted: q('fkontak') })
    }
    
    if (action === 'off') {
      antilinkData[groupId] = { enabled: false, ...antilinkData[groupId] }
      saveAntiLink(antilinkData)
      
      return conn.sendMessage(m.chat, {
        text: `❌ *Anti Link* telah dinonaktifkan di grup ini!`
      }, { quoted: q('fkontak') })
    }
    
    if (action === 'kick') {
      antilinkData[groupId] = { enabled: true, mode: 'kick', ...antilinkData[groupId] }
      saveAntiLink(antilinkData)
      
      return conn.sendMessage(m.chat, {
        text: `✅ *Anti Link* diatur ke mode KICK!\n\n⚠️ Member yang mengirim link akan di-kick dari grup.`
      }, { quoted: q('fkontak') })
    }
  }

  // Tampilkan menu antilink dengan button
  const statusText = `
╭━━━❰ *ANTI LINK SETTINGS* ❱━━━╮
┃
┃ 📊 *Status:* ${currentStatus ? '✅ AKTIF' : '❌ NONAKTIF'}
┃ 🎯 *Mode:* ${antilinkData[groupId]?.mode || 'delete'}
┃
┃ 📝 *Deskripsi:*
┃ Fitur ini akan menghapus atau
┃ mengkick member yang mengirim
┃ link di grup.
┃
┃ ⚙️ *Cara Penggunaan:*
┃ • .antilink on - Aktifkan
┃ • .antilink off - Matikan
┃ • .antilink kick - Mode kick
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

  const buttons = [
    ...button.flow.quickReply(currentStatus ? "❌ Matikan" : "✅ Aktifkan", currentStatus ? ".antilink off" : ".antilink on"),
    ...button.flow.quickReply("⚡ Mode Kick", ".antilink kick"),
    ...button.flow.quickReply("📋 Menu", ".menuplug"),
    ...button.flow.singleSelect("⚙️ Pengaturan", [
      {
        title: "Anti Link Options",
        rows: [
          { title: "✅ Aktifkan", description: "Aktifkan anti link", id: ".antilink on" },
          { title: "❌ Matikan", description: "Nonaktifkan anti link", id: ".antilink off" },
          { title: "⚡ Mode Kick", description: "Kick member kirim link", id: ".antilink kick" }
        ]
      }
    ])
  ]

  await button.sendInteractive(statusText, buttons, {
    title: "Anti Link Control",
    body: `Status: ${currentStatus ? 'Aktif' : 'Nonaktif'}`,
    thumbnailUrl: global.thumbnail || "https://files.catbox.moe/5x2b8n.jpg"
  })
}

handler.help = ['antilink']
handler.tags = ['group']
handler.command = ['antilink', 'antilinkgc']
handler.group = true
handler.admin = true
handler.botAdmin = true

module.exports = handler
