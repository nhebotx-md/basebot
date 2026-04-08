/**
 * Group Info Plugin
 * Category: groupmenu
 * Feature: Menampilkan informasi lengkap grup
 */

const handler = async (m, Obj) => {
  const { conn, q, isGroup, groupMetadata, groupAdmins, isBotAdmins, isAdmins } = Obj

  if (!isGroup) {
    return conn.sendMessage(m.chat, {
      text: "❌ Fitur ini hanya bisa digunakan di grup!"
    }, { quoted: q('fkontak') })
  }

  try {
    const meta = await conn.groupMetadata(m.chat)
    const totalMembers = meta.participants.length
    const admins = meta.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    const superAdmin = meta.participants.find(p => p.admin === 'superadmin')
    
    // Hitung member berdasarkan status
    const onlineMembers = meta.participants.filter(p => !p.lid).length
    const lidMembers = meta.participants.filter(p => p.lid).length
    
    // Informasi grup
    const groupInfo = `
╭───〔 *GROUP INFORMATION* 〕───╮
│
│ 📛 *Nama Grup:* ${meta.subject}
│ 📝 *Deskripsi:* ${meta.desc || 'Tidak ada deskripsi'}
│
│ 👥 *Total Member:* ${totalMembers}
│ 👑 *Owner Grup:* @${superAdmin ? superAdmin.id.split('@')[0] : 'Tidak diketahui'}
│ 🛡️ *Total Admin:* ${admins.length}
│ 📅 *Dibuat:* ${new Date(meta.creation * 1000).toLocaleDateString('id-ID')}
│ 🔗 *ID Grup:* ${meta.id}
│
│ ⚙️ *Pengaturan:*
│ • Restrict: ${meta.restrict ? '✅' : '❌'}
│ • Announce: ${meta.announce ? '✅ (Hanya admin)' : '❌ (Semua)'}
│ • Ephemeral: ${meta.ephemeralDuration ? meta.ephemeralDuration + ' detik' : '❌'}
│
│ 👤 *Member Status:*
│ • Online: ${onlineMembers}
│ • LID: ${lidMembers}
│
│ 🤖 *Bot Status:*
│ • Admin: ${isBotAdmins ? '✅' : '❌'}
│ • Anda Admin: ${isAdmins ? '✅' : '❌'}
│
╰──────────────────────────────╯
    `.trim()

    // Dapatkan foto profil grup
    let ppUrl
    try {
      ppUrl = await conn.profilePictureUrl(m.chat, 'image')
    } catch {
      ppUrl = 'https://files.catbox.moe/5x2b8n.jpg'
    }

    // Kirim dengan external ad reply
    await conn.sendMessage(m.chat, {
      text: groupInfo,
      mentions: superAdmin ? [superAdmin.id] : [],
      contextInfo: {
        externalAdReply: {
          title: meta.subject,
          body: `👥 ${totalMembers} Member | 🛡️ ${admins.length} Admin`,
          thumbnailUrl: ppUrl,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: q('fkontak') })

  } catch (err) {
    console.error("GroupInfo Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Terjadi kesalahan saat mengambil info grup"
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['groupinfo', 'gcinfo', 'infogc']
handler.tags = ['groupmenu']
handler.command = ["groupinfo", "gcinfo", "infogc"]
handler.group = true

module.exports = handler
