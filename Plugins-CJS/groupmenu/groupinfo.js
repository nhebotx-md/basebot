/**
 * Plugin: groupinfo.js
 * Description: Menampilkan informasi lengkap grup
 * Command: .groupinfo, .gcinfo, .infogc
 */

const handler = async (m, Obj) => {
  const { conn, q, button, isGroup, groupMetadata, groupAdmins, isBotAdmins, isAdmins, participants } = Obj

  if (!isGroup) {
    return conn.sendMessage(m.chat, {
      text: "❌ Fitur ini hanya bisa digunakan di grup!"
    }, { quoted: q('fkontak') })
  }

  try {
    const meta = groupMetadata || await conn.groupMetadata(m.chat)
    const totalMembers = meta.participants?.length || 0
    const adminCount = groupAdmins?.length || meta.participants?.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length || 0
    const owner = meta.participants?.find(p => p.admin === 'superadmin')?.id || 'Tidak diketahui'
    const created = new Date(meta.creation * 1000).toLocaleDateString('id-ID')
    
    // Hitung member berdasarkan status
    const onlineMembers = meta.participants?.filter(p => !p.id.includes('newsletter')).length || 0

    const infoText = `
╭━━━❰ *GROUP INFORMATION* ❱━━━╮
┃
┃ 📛 *Nama:* ${meta.subject}
┃ 📝 *Deskripsi:* ${meta.desc || 'Tidak ada'}
┃
┃ 👥 *Total Member:* ${totalMembers}
┃ 👑 *Admin:* ${adminCount}
┃ 👤 *Owner:* @${owner.split('@')[0]}
┃ 📅 *Dibuat:* ${created}
┃ 🔗 *ID:* ${meta.id}
┃
┃ ⚙️ *Pengaturan:*
┃ ${meta.announce ? '🔒' : '🔓'} Announce: ${meta.announce ? 'ON' : 'OFF'}
┃ ${meta.restrict ? '🔒' : '🔓'} Restrict: ${meta.restrict ? 'ON' : 'OFF'}
┃
┃ 🤖 *Bot Status:*
┃ ${isBotAdmins ? '✅ Admin' : '❌ Bukan Admin'}
┃ ${isAdmins ? '✅ Kamu Admin' : '❌ Kamu Member'}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    // Button untuk aksi grup
    const buttons = [
      ...button.flow.quickReply("🔗 Link Group", ".linkgc"),
      ...button.flow.quickReply("👥 List Admin", ".listadmin"),
      ...button.flow.quickReply("📋 Menu", ".menuplug"),
      ...button.flow.singleSelect("⚙️ Aksi Grup", [
        {
          title: "Group Actions",
          rows: [
            { title: "🔓 Buka Group", description: "Buka group untuk semua", id: ".open" },
            { title: "🔒 Tutup Group", description: "Tutup group (admin only)", id: ".close" },
            { title: "📢 Tag All", description: "Tag semua member", id: ".tagall" },
            { title: "👻 Hide Tag", description: "Hide tag semua member", id: ".hidetag" }
          ]
        }
      ])
    ]

    await button.sendInteractive(infoText, buttons, {
      title: "Group Info",
      body: meta.subject,
      thumbnailUrl: meta.subjectPic || global.thumbnail || "https://files.catbox.moe/5x2b8n.jpg"
    })

  } catch (err) {
    console.error("GroupInfo Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal mengambil info grup: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['groupinfo']
handler.tags = ['group']
handler.command = ['groupinfo', 'gcinfo', 'infogc']
handler.group = true

module.exports = handler
