/**
 * Plugin: hidetag.js
 * Description: Hide tag semua member grup
 * Command: .hidetag, .ht
 */

const handler = async (m, Obj) => {
  const { conn, q, button, isGroup, isAdmins, groupMetadata, participants, text } = Obj

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

  try {
    const meta = groupMetadata || await conn.groupMetadata(m.chat)
    const members = meta.participants || participants || []
    
    const message = text || "📢 *Hidden Tag*"

    // Send with mentions but no visible tags
    await conn.sendMessage(m.chat, {
      text: message,
      mentions: members.map(m => m.id)
    }, { quoted: m })

    // Success buttons
    const buttons = [
      ...button.flow.quickReply("📢 Tag All", ".tagall"),
      ...button.flow.quickReply("📊 Group Info", ".groupinfo"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(`✅ Hide tag berhasil! (${members.length} member)`, buttons, {
      title: "Hide Tag Complete",
      body: `${members.length} members notified`
    })

  } catch (err) {
    console.error("Hide Tag Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal hide tag: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['hidetag']
handler.tags = ['group']
handler.command = ['hidetag', 'ht', 'hidentag']
handler.group = true
handler.admin = true

module.exports = handler
