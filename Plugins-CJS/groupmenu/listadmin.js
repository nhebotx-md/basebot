/**
 * Plugin: listadmin.js
 * Description: List admin grup
 * Command: .listadmin, .adminlist
 */

const handler = async (m, Obj) => {
  const { conn, q, button, isGroup, groupMetadata, groupAdmins } = Obj

  if (!isGroup) {
    return conn.sendMessage(m.chat, {
      text: "❌ Fitur ini hanya bisa digunakan di grup!"
    }, { quoted: q('fkontak') })
  }

  try {
    const meta = groupMetadata || await conn.groupMetadata(m.chat)
    const admins = meta.participants?.filter(p => p.admin === 'admin' || p.admin === 'superadmin') || []
    const owner = admins.find(p => p.admin === 'superadmin')

    let adminText = `
╭━━━❰ *LIST ADMIN* ❱━━━╮
┃
┃ 👥 *Grup:* ${meta.subject}
┃ 👑 *Total Admin:* ${admins.length}
┃
┃ 👤 *Owner:*
┃ @${owner?.id?.split('@')[0] || 'Tidak diketahui'}
┃
┃ 👑 *Admin:*\n`

    admins.filter(a => a.admin === 'admin').forEach((admin, i) => {
      adminText += `┃ ${i + 1}. @${admin.id.split('@')[0]}\n`
    })

    adminText += `┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🔗 Link Group", ".linkgc"),
      ...button.flow.quickReply("📊 Group Info", ".groupinfo"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await conn.sendMessage(m.chat, {
      text: adminText,
      mentions: admins.map(a => a.id)
    }, { quoted: m })

    await button.sendInteractive("✅ Daftar admin berhasil ditampilkan!", buttons, {
      title: "Admin List",
      body: `${admins.length} admin`
    })

  } catch (err) {
    console.error("List Admin Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal mengambil daftar admin: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['listadmin']
handler.tags = ['group']
handler.command = ['listadmin', 'adminlist', 'admins']
handler.group = true

module.exports = handler
