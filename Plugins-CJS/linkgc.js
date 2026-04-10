/**
 * Plugin: linkgc.js
 * Description: Dapatkan link invite grup
 * Command: .linkgc, .linkgroup, .gclink
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
        const groupLink = await conn.groupInviteCode(m.chat);
        const groupMetadata = await conn.groupMetadata(m.chat);

        const linkText = `
╭━━━❰ *LINK GROUP* ❱━━━╮
┃
┃ 📛 *Nama:* ${groupMetadata.subject || 'Unknown'}
┃
┃ 🔗 *Link:*
┃ https://chat.whatsapp.com/${groupLink}
┃
┃ 💡 *Cara pakai:*
┃ Kirim link ini ke orang
┃ yang ingin diinvite.
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("📋 Copy Link", `.linkgc`),
            ...button.flow.quickReply("📋 Info Grup", ".groupinfo"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: linkText,
            buttons: buttons,
            title: groupMetadata.subject || "Group Link",
            body: "Invite Link"
        });

    } catch (error) {
        console.error('Link GC Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal mengambil link grup'}`,
            title: "Error",
            body: "Get Link Failed"
        });
    }
};

handler.command = ['linkgc', 'linkgroup', 'gclink', 'grouplink'];
handler.tags = ['group'];
handler.help = ['linkgc'];

module.exports = handler;
