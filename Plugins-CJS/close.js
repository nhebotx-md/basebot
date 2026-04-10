/**
 * Plugin: close.js
 * Description: Tutup grup (hanya admin yang bisa kirim pesan)
 * Command: .close, .tutup
 */

const handler = async (m, Obj) => {
    const { conn, q, button, isGroup, isAdmins, isBotAdmins, replyAdaptive } = Obj;

    if (!isGroup) {
        return replyAdaptive({
            text: '❌ Fitur ini hanya bisa digunakan di dalam grup!',
            title: "Error",
            body: "Group Only"
        });
    }

    if (!isAdmins) {
        return replyAdaptive({
            text: '❌ Hanya admin grup yang bisa menggunakan fitur ini!',
            title: "Error",
            body: "Admin Only"
        });
    }

    if (!isBotAdmins) {
        return replyAdaptive({
            text: '❌ Bot harus menjadi admin untuk menggunakan fitur ini!',
            title: "Error",
            body: "Bot Admin Required"
        });
    }

    try {
        await conn.groupSettingUpdate(m.chat, 'announcement');
        
        const closeText = `
╭━━━❰ *GROUP CLOSED* ❱━━━╮
┃
┃ 🔒 *Grup ditutup!*
┃
┃ Sekarang hanya admin yang
┃ bisa mengirim pesan.
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("🔓 Buka Grup", ".open"),
            ...button.flow.quickReply("📋 Info Grup", ".groupinfo"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: closeText,
            buttons: buttons,
            title: "Group Closed",
            body: "Only admins can send messages"
        });

    } catch (error) {
        console.error('Close Group Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal menutup grup'}`,
            title: "Error",
            body: "Close Group Failed"
        });
    }
};

handler.command = ['close', 'tutup', 'gclose'];
handler.tags = ['group'];
handler.help = ['close'];

module.exports = handler;
