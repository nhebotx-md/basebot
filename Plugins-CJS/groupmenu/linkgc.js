/**
 * Plugin: linkgc.js
 * Description: Link grup
 * Command: .linkgc, .grouplink
 */

const handler = async (m, Obj) => {
  const { conn, q, button, isGroup, isBotAdmins, isAdmins } = Obj

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

  try {
    const groupLink = await conn.groupInviteCode(m.chat)
    const fullLink = `https://chat.whatsapp.com/${groupLink}`

    const linkText = `
╭━━━❰ *LINK GROUP* ❱━━━╮
┃
┃ 🔗 *Link Grup:*
┃ ${fullLink}
┃
┃ ⚠️ *Peringatan:*
┃ Jangan share link ini
┃ ke orang yang tidak
┃ dikenal!
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.ctaUrl("🔗 Buka Link", fullLink),
      ...button.flow.quickReply("🔄 Reset Link", ".resetlinkgc"),
      ...button.flow.quickReply("📊 Group Info", ".groupinfo"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(linkText, buttons, {
      title: "Group Link",
      body: "Link invite grup"
    })

  } catch (err) {
    console.error("Link GC Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal mengambil link grup: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['linkgc']
handler.tags = ['group']
handler.command = ['linkgc', 'grouplink', 'linkgroup']
handler.group = true
handler.botAdmin = true

module.exports = handler
