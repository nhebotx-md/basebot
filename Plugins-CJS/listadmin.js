/**
 * Plugin: listadmin.js
 * Description: Menampilkan daftar admin grup
 * Command: .listadmin, .adminlist, .admins
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
        const owner = participants.find(p => p.admin === 'superadmin');

        if (admins.length === 0) {
            return replyAdaptive({
                text: '❌ Tidak ada admin di grup ini!',
                title: "Error",
                body: "No Admins"
            });
        }

        let adminText = `
╭━━━❰ *LIST ADMIN* ❱━━━╮
┃
┃ 📛 *Grup:* ${groupMetadata.subject || 'Unknown'}
┃ 👑 *Total Admin:* ${admins.length}
┃
`;

        admins.forEach((admin, i) => {
            const isOwner = admin.admin === 'superadmin';
            adminText += `┃ ${i + 1}. @${admin.id.split('@')[0]} ${isOwner ? '👑' : '👤'}\n`;
        });

        adminText += `┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("⬆️ Promote", ".promote"),
            ...button.flow.quickReply("⬇️ Demote", ".demote"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: adminText,
            buttons: buttons,
            mentions: admins.map(a => a.id),
            title: "List Admin",
            body: `${admins.length} admins`
        });

    } catch (error) {
        console.error('List Admin Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal mengambil daftar admin'}`,
            title: "Error",
            body: "List Admin Failed"
        });
    }
};

handler.command = ['listadmin', 'adminlist', 'admins', 'daftaradmin'];
handler.tags = ['group'];
handler.help = ['listadmin'];

module.exports = handler;
