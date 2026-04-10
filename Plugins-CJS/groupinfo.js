/**
 * Plugin: groupinfo.js
 * Description: Menampilkan info grup
 * Command: .groupinfo, .gcinfo
 */

const handler = async (m, Obj) => {
    const { conn, q, button, isGroup, replyAdaptive } = Obj;

    if (!isGroup) {
        return replyAdaptive({
            text: '❌ Fitur ini hanya bisa digunakan di dalam grup!',
            title: "Error",
            body: "Group Only"
        });
    }

    try {
        const groupMetadata = await conn.groupMetadata(m.chat);
        const participants = groupMetadata.participants || [];
        const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        const isAnnouncement = groupMetadata.announce === true;
        const isRestricted = groupMetadata.restrict === true;

        const infoText = `
╭━━━❰ *GROUP INFO* ❱━━━╮
┃
┃ 📛 *Nama:* ${groupMetadata.subject || 'Unknown'}
┃ 📝 *Deskripsi:* ${groupMetadata.desc || 'Tidak ada'}
┃
┃ 👥 *Total Member:* ${participants.length}
┃ 👑 *Total Admin:* ${admins.length}
┃
┃ 🔒 *Status:* ${isAnnouncement ? '🔒 Tertutup' : '🔓 Terbuka'}
┃ 🛡️ *Restrict:* ${isRestricted ? '✅ Aktif' : '❌ Nonaktif'}
┃
┃ 📅 *Dibuat:* ${new Date(groupMetadata.creation * 1000).toLocaleDateString('id-ID')}
┃ 👤 *Owner:* @${groupMetadata.owner?.split('@')[0] || 'Unknown'}
┃
┃ 🔗 *ID:* ${groupMetadata.id}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("👥 List Admin", ".listadmin"),
            ...button.flow.quickReply("🔗 Link GC", ".linkgc"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: infoText,
            buttons: buttons,
            mentions: groupMetadata.owner ? [groupMetadata.owner] : [],
            title: groupMetadata.subject || "Group Info",
            body: `${participants.length} members`
        });

    } catch (error) {
        console.error('Group Info Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal mengambil info grup'}`,
            title: "Error",
            body: "Group Info Failed"
        });
    }
};

handler.command = ['groupinfo', 'gcinfo', 'infogc'];
handler.tags = ['group'];
handler.help = ['groupinfo'];

module.exports = handler;
