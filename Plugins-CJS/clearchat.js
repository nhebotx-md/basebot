/**
 * Plugin: clearchat.js
 * Description: Clear semua chat
 * Command: .clearchat, .cc
 */

const handler = async (m, Obj) => {
    const { conn, q, button, isOwn, replyAdaptive } = Obj;

    if (!isOwn) {
        return replyAdaptive({
            text: '❌ Fitur ini hanya untuk owner bot!',
            title: "Error",
            body: "Owner Only"
        });
    }

    try {
        const helpText = `
╭━━━❰ *CLEAR CHAT* ❱━━━╮
┃
┃ 🗑️ Hapus semua chat
┃
┃ ⚠️ *Peringatan:*
┃ Tindakan ini akan menghapus
┃ semua chat dari database.
┃
┃ Lanjutkan?
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("✅ Ya, Hapus", ".clearchat confirm"),
            ...button.flow.quickReply("❌ Batal", ".menuplug")
        ];

        // Check if confirmation
        const isConfirm = m.text && m.text.includes('confirm');
        
        if (!isConfirm) {
            return replyAdaptive({
                text: helpText,
                buttons: buttons,
                title: "Clear Chat",
                body: "Confirmation Required"
            });
        }

        await replyAdaptive({
            text: '⏳ Sedang menghapus chat...',
            title: "Clear Chat",
            body: "Please wait..."
        });

        // Get all chats
        const chats = Object.keys(conn.chats || {});
        let cleared = 0;

        for (const chatId of chats) {
            try {
                await conn.chatModify({
                    delete: true,
                    lastMessages: [{ key: m.key, messageTimestamp: m.messageTimestamp }]
                }, chatId);
                cleared++;
            } catch (err) {
                console.error(`Failed to clear ${chatId}:`, err.message);
            }
        }

        const resultText = `
╭━━━❰ *CLEAR CHAT SELESAI* ❱━━━╮
┃
┃ ✅ *Chat dihapus:* ${cleared}
┃
┃ Semua chat telah dibersihkan.
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const resultButtons = [
            ...button.flow.quickReply("📋 Menu", ".menuplug"),
            ...button.flow.quickReply("📢 Broadcast", ".bc Hello!")
        ];

        return replyAdaptive({
            text: resultText,
            buttons: resultButtons,
            title: "Clear Chat Complete",
            body: `${cleared} chats cleared`
        });

    } catch (error) {
        console.error('Clear Chat Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal menghapus chat'}`,
            title: "Error",
            body: "Clear Chat Failed"
        });
    }
};

handler.command = ['clearchat', 'cc', 'clear'];
handler.tags = ['owner'];
handler.help = ['clearchat'];

module.exports = handler;
