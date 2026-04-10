/**
 * Plugin: demote.js
 * Description: Demote admin grup menjadi member
 * Command: .demote
 */

const handler = async (m, Obj) => {
    const { conn, q, button, isGroup, isAdmins, isBotAdmins, replyAdaptive, mentionedJid } = Obj;

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

    // Get mentioned users
    let users = mentionedJid || [];
    
    // Check quoted message
    if (m.quoted && m.quoted.sender) {
        users.push(m.quoted.sender);
    }

    if (users.length === 0) {
        const helpText = `
╭━━━❰ *DEMOTE* ❱━━━╮
┃
┃ 👇 Demote admin menjadi member
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .demote @user
┃ .demote (reply pesan user)
┃
┃ *Contoh:*
┃ .demote @6281234567890
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("⬆️ Promote", ".promote"),
            ...button.flow.quickReply("📋 List Admin", ".listadmin"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "Demote",
            body: "Remove admin status"
        });
    }

    try {
        let demoted = [];
        let failed = [];

        for (const user of users) {
            try {
                await conn.groupParticipantsUpdate(m.chat, [user], 'demote');
                demoted.push(user.split('@')[0]);
            } catch (err) {
                failed.push(user.split('@')[0]);
            }
        }

        let resultText = `
╭━━━❰ *DEMOTE RESULT* ❱━━━╮
┃
`;
        
        if (demoted.length > 0) {
            resultText += `┃ ✅ *Berhasil demote:*\n┃ ${demoted.map(n => `@${n}`).join('\n┃ ')}\n┃\n`;
        }
        
        if (failed.length > 0) {
            resultText += `┃ ❌ *Gagal demote:*\n┃ ${failed.map(n => `@${n}`).join('\n┃ ')}\n┃\n`;
        }
        
        resultText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("⬆️ Promote", ".promote"),
            ...button.flow.quickReply("📋 List Admin", ".listadmin"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: resultText,
            buttons: buttons,
            mentions: users,
            title: "Demote Complete",
            body: `${demoted.length} users demoted`
        });

    } catch (error) {
        console.error('Demote Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal demote user'}`,
            title: "Error",
            body: "Demote Failed"
        });
    }
};

handler.command = ['demote', 'unadmin'];
handler.tags = ['group'];
handler.help = ['demote @user'];

module.exports = handler;
