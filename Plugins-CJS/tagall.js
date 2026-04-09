/**
 * Plugin: tagall.js
 * Description: Tag semua member grup
 * Command: .tagall, .all
 */

const handler = async (m, Obj) => {
  const { conn, q, button, isGroup, isAdmins, isBotAdmins, groupMetadata, participants, text } = Obj

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
    
    const message = text || "📢 *Tag All Members*"

    let tagText = `${message}\n\n`
    tagText += `👥 *Total Member:* ${members.length}\n\n`

    members.forEach((member, i) => {
      tagText += `@${member.id.split('@')[0]} `
      if ((i + 1) % 5 === 0) tagText += '\n'
    })

    await conn.sendMessage(m.chat, {
      text: tagText,
      mentions: members.map(m => m.id)
    }, { quoted: m })

    // Success buttons
    const buttons = [
      ...button.flow.quickReply("👻 Hide Tag", ".hidetag"),
      ...button.flow.quickReply("📊 Group Info", ".groupinfo"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(`✅ Berhasil tag ${members.length} member!`, buttons, {
      title: "Tag All Complete",
      body: `${members.length} members tagged`
    })

  } catch (err) {
    console.error("Tag All Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal tag all: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['tagall']
handler.tags = ['group']
handler.command = ['tagall', 'all', 'tagsemua']
handler.group = true
handler.admin = true

module.exports = handler
