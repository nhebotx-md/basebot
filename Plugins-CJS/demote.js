/**
 * Plugin: demote.js
 * Description: Demote admin jadi member
 * Command: .demote, .dem
 */

const handler = async (m, Obj) => {
  const { conn, q, button, isGroup, isAdmins, isBotAdmins, quoted, mentions } = Obj

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

  // Get target user
  let target = quoted ? quoted.sender : mentions && mentions[0] ? mentions[0] : null

  if (!target) {
    const helpText = `
╭━━━❰ *DEMOTE* ❱━━━╮
┃
┃ 🚫 Demote admin jadi member
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ 1. Reply pesan admin dengan .demote
┃ 2. .demote @user
┃
┃ *Contoh:*
┃ .demote @6281234567890
┃ (Reply pesan admin)
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("👑 Promote", ".promote"),
      ...button.flow.quickReply("👥 List Admin", ".listadmin"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "Demote Admin",
      body: "Turunkan admin menjadi member"
    })
  }

  try {
    await conn.groupParticipantsUpdate(m.chat, [target], 'demote')

    const demoteText = `
╭━━━❰ *DEMOTED* ❱━━━╮
┃
┃ 🚫 *Admin telah didemote!*
┃
┃ 👤 @${target.split('@')[0]}
┃
┃ ❌ Sekarang menjadi member
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("👑 Promote", `.promote @${target.split('@')[0]}`),
      ...button.flow.quickReply("👥 List Admin", ".listadmin"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await conn.sendMessage(m.chat, {
      text: demoteText,
      mentions: [target]
    }, { quoted: m })

    await button.sendInteractive("✅ Demote berhasil!", buttons, {
      title: "Demote Success",
      body: "User is now member"
    })

  } catch (err) {
    console.error("Demote Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal demote: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['demote']
handler.tags = ['group']
handler.command = ['demote', 'dem', 'turunkanadmin']
handler.group = true
handler.admin = true
handler.botAdmin = true

module.exports = handler
