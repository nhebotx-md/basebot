/**
 * Plugin: open.js
 * Description: Buka grup (semua member bisa kirim pesan)
 * Command: .open, .buka
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
        await conn.groupSettingUpdate(m.chat, 'not_announcement');
        
        const openText = `
╭━━━❰ *GROUP OPENED* ❱━━━╮
┃
┃ 🔓 *Grup dibuka!*
┃
┃ Sekarang semua member
┃ bisa mengirim pesan.
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("🔒 Tutup Grup", ".close"),
            ...button.flow.quickReply("📋 Info Grup", ".groupinfo"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: openText,
            buttons: buttons,
            title: "Group Opened",
            body: "All members can send messages"
        });

    } catch (error) {
        console.error('Open Group Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal membuka grup'}`,
            title: "Error",
            body: "Open Group Failed"
        });
    }
};

handler.command = ['open', 'buka', 'gopen'];
handler.tags = ['group'];
handler.help = ['open'];

module.exports = handler;
