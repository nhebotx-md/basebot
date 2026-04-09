/**
 * Plugin: close.js
 * Description: Tutup grup (hanya admin bisa kirim pesan)
 * Command: .close, .tutupgrup
 */

const handler = async (m, Obj) => {
  const { conn, q, button, isGroup, isAdmins, isBotAdmins } = Obj

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

  try {
    await conn.groupSettingUpdate(m.chat, 'announcement')

    const closeText = `
╭━━━❰ *GROUP DITUTUP* ❱━━━╮
┃
┃ 🔒 *Grup telah ditutup!*
┃
┃ ⚠️ Hanya admin yang bisa
┃ mengirim pesan sekarang.
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🔓 Buka Grup", ".open"),
      ...button.flow.quickReply("📊 Group Info", ".groupinfo"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(closeText, buttons, {
      title: "Group Closed",
      body: "Only admins can send messages"
    })

  } catch (err) {
    console.error("Close Group Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal menutup grup: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['close']
handler.tags = ['group']
handler.command = ['close', 'tutupgrup', 'tutupgc']
handler.group = true
handler.admin = true
handler.botAdmin = true

module.exports = handler
