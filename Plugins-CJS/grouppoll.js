/**
 * Plugin: grouppoll.js
 * Description: Buat polling/voting di grup
 * Command: .grouppoll, .poll, .voting
 */

const handler = async (m, Obj) => {
    const { conn, q, button, text, isGroup, isAdmins, replyAdaptive } = Obj;

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

    // Parse input: question | option1 | option2 | option3
    const args = text.split('|').map(s => s.trim()).filter(Boolean);

    if (args.length < 3) {
        const helpText = `
╭━━━❰ *GROUP POLL* ❱━━━╮
┃
┃ 📊 Buat polling/voting
┃
┃ 📝 *Format:*
┃ .poll Pertanyaan | Opsi1 | Opsi2 | Opsi3
┃
┃ *Contoh:*
┃ .poll Mau makan apa? | Pizza | Burger | Nasi
┃ .poll Meeting kapan? | Senin | Selasa | Rabu
┃
┃ 💡 *Tips:*
┃ • Minimal 2 opsi
┃ • Maksimal 12 opsi
┃ • Pisahkan dengan |
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("📊 Contoh Poll", ".poll Mau makan apa? | Pizza | Burger"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "Group Poll",
            body: "Create voting"
        });
    }

    try {
        const question = args[0];
        const options = args.slice(1);

        if (options.length > 12) {
            return replyAdaptive({
                text: '❌ Maksimal 12 opsi!',
                title: "Error",
                body: "Too Many Options"
            });
        }

        // Create poll
        await conn.sendMessage(m.chat, {
            poll: {
                name: question,
                values: options,
                selectableCount: 1
            }
        });

    } catch (error) {
        console.error('Poll Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal membuat poll'}`,
            title: "Error",
            body: "Poll Failed"
        });
    }
};

handler.command = ['grouppoll', 'poll', 'voting', 'vote'];
handler.tags = ['group'];
handler.help = ['poll Pertanyaan | Opsi1 | Opsi2'];

module.exports = handler;
