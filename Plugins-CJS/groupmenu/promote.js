/**
 * Plugin: promote.js
 * Description: Promote member jadi admin
 * Command: .promote, .prom
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
╭━━━❰ *PROMOTE* ❱━━━╮
┃
┃ 👑 Promote member jadi admin
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ 1. Reply pesan user dengan .promote
┃ 2. .promote @user
┃
┃ *Contoh:*
┃ .promote @6281234567890
┃ (Reply pesan user)
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🚫 Demote", ".demote"),
      ...button.flow.quickReply("👥 List Admin", ".listadmin"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "Promote Member",
      body: "Jadikan member sebagai admin"
    })
  }

  try {
    await conn.groupParticipantsUpdate(m.chat, [target], 'promote')

    const promoteText = `
╭━━━❰ *PROMOTED* ❱━━━╮
┃
┃ 👑 *User telah dipromote!*
┃
┃ 👤 @${target.split('@')[0]}
┃
┃ ✅ Sekarang menjadi admin
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🚫 Demote", `.demote @${target.split('@')[0]}`),
      ...button.flow.quickReply("👥 List Admin", ".listadmin"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await conn.sendMessage(m.chat, {
      text: promoteText,
      mentions: [target]
    }, { quoted: m })

    await button.sendInteractive("✅ Promote berhasil!", buttons, {
      title: "Promote Success",
      body: "User is now admin"
    })

  } catch (err) {
    console.error("Promote Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal promote: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['promote']
handler.tags = ['group']
handler.command = ['promote', 'prom', 'jadikanadmin']
handler.group = true
handler.admin = true
handler.botAdmin = true

module.exports = handler
