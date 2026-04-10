/**
 * Plugin: promote.js
 * Description: Promote member menjadi admin grup
 * Command: .promote
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
╭━━━❰ *PROMOTE* ❱━━━╮
┃
┃ ⬆️ Promote member jadi admin
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .promote @user
┃ .promote (reply pesan user)
┃
┃ *Contoh:*
┃ .promote @6281234567890
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("⬇️ Demote", ".demote"),
            ...button.flow.quickReply("📋 List Admin", ".listadmin"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "Promote",
            body: "Make member admin"
        });
    }

    try {
        let promoted = [];
        let failed = [];

        for (const user of users) {
            try {
                await conn.groupParticipantsUpdate(m.chat, [user], 'promote');
                promoted.push(user.split('@')[0]);
            } catch (err) {
                failed.push(user.split('@')[0]);
            }
        }

        let resultText = `
╭━━━❰ *PROMOTE RESULT* ❱━━━╮
┃
`;
        
        if (promoted.length > 0) {
            resultText += `┃ ✅ *Berhasil promote:*\n┃ ${promoted.map(n => `@${n}`).join('\n┃ ')}\n┃\n`;
        }
        
        if (failed.length > 0) {
            resultText += `┃ ❌ *Gagal promote:*\n┃ ${failed.map(n => `@${n}`).join('\n┃ ')}\n┃\n`;
        }
        
        resultText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("⬇️ Demote", ".demote"),
            ...button.flow.quickReply("📋 List Admin", ".listadmin"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: resultText,
            buttons: buttons,
            mentions: users,
            title: "Promote Complete",
            body: `${promoted.length} users promoted`
        });

    } catch (error) {
        console.error('Promote Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal promote user'}`,
            title: "Error",
            body: "Promote Failed"
        });
    }
};

handler.command = ['promote', 'makeadmin'];
handler.tags = ['group'];
handler.help = ['promote @user'];

module.exports = handler;
