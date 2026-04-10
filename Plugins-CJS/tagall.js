/**
 * Plugin: tagall.js
 * Description: Tag semua member grup
 * Command: .tagall, .all
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

        const message = text || '📢 Tag All Members';

        let tagText = `
╭━━━❰ *TAG ALL* ❱━━━╮
┃
┃ 📢 *Pesan:*
┃ ${message}
┃
┃ 👥 *Total Member:* ${participants.length}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

`;

        // Add mentions
        tagText += memberJids.map(jid => `@${jid.split('@')[0]}`).join(' ');

        const buttons = [
            ...button.flow.quickReply("👻 Hidetag", ".hidetag"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: tagText,
            buttons: buttons,
            mentions: memberJids,
            title: "Tag All",
            body: `${participants.length} members tagged`
        });

    } catch (error) {
        console.error('Tag All Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal tag all'}`,
            title: "Error",
            body: "Tag All Failed"
        });
    }
};

handler.command = ['tagall', 'all', 'tagsemua'];
handler.tags = ['group'];
handler.help = ['tagall <pesan>'];

module.exports = handler;
