/**
 * Plugin: open.js
 * Description: Buka grup (semua bisa kirim pesan)
 * Command: .open, .bukagrup
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
    await conn.groupSettingUpdate(m.chat, 'not_announcement')

    const openText = `
╭━━━❰ *GROUP DIBUKA* ❱━━━╮
┃
┃ 🔓 *Grup telah dibuka!*
┃
┃ ✅ Semua member sekarang
┃ bisa mengirim pesan.
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🔒 Tutup Grup", ".close"),
      ...button.flow.quickReply("📊 Group Info", ".groupinfo"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(openText, buttons, {
      title: "Group Opened",
      body: "Everyone can send messages"
    })

  } catch (err) {
    console.error("Open Group Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal membuka grup: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['open']
handler.tags = ['group']
handler.command = ['open', 'bukagrup', 'bukagc']
handler.group = true
handler.admin = true
handler.botAdmin = true

module.exports = handler
