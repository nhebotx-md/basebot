/**
 * Plugin: hidetag.js
 * Description: Tag semua member tanpa mention
 * Command: .hidetag, .ht
 */

const handler = async (m, Obj) => {
    const { conn, q, button, text, isGroup, isAdmins, isBotAdmins, replyAdaptive } = Obj;

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
        const groupMetadata = await conn.groupMetadata(m.chat);
        const participants = groupMetadata.participants || [];
        const memberJids = participants.map(p => p.id);

        const message = text || '📢 Pesan dari admin';

        await conn.sendMessage(m.chat, {
            text: message,
            mentions: memberJids
        }, { quoted: q('fkontak') });

    } catch (error) {
        console.error('Hidetag Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal mengirim hidetag'}`,
            title: "Error",
            body: "Hidetag Failed"
        });
    }
};

handler.command = ['hidetag', 'ht', 'h'];
handler.tags = ['group'];
handler.help = ['hidetag <pesan>'];

module.exports = handler;
