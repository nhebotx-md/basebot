/**
 * Plugin: broadcast.js
 * Description: Broadcast pesan ke semua chat
 * Command: .broadcast, .bc
 */

const handler = async (m, Obj) => {
    const { conn, q, button, text, isOwn, replyAdaptive } = Obj;

    if (!isOwn) {
        return replyAdaptive({
            text: '❌ Fitur ini hanya untuk owner bot!',
            title: "Error",
            body: "Owner Only"
        });
    }

    if (!text) {
        const helpText = `
╭━━━❰ *BROADCAST* ❱━━━╮
┃
┃ 📢 Kirim pesan ke semua chat
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .bc <pesan>
┃ .broadcast <pesan>
┃
┃ *Contoh:*
┃ .bc Halo semuanya!
┃ .bc 📢 Pengumuman penting!
┃
⚠️ *Peringatan:*
┃ • Gunakan dengan bijak
┃ • Jangan spam
┃ • Hanya owner yang bisa
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("📋 Menu", ".menuplug"),
            ...button.flow.quickReply("👤 Owner", ".owner")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "Broadcast",
            body: "Owner Feature"
        });
    }

    try {
        await replyAdaptive({
            text: '⏳ Sedang mengirim broadcast...',
            title: "Broadcast",
            body: "Please wait..."
        });

        // Get all chats
        const chats = await conn.groupFetchAllParticipating().catch(() => ({}));
        const privateChats = Object.keys(conn.chats || {}).filter(jid => 
            jid.endsWith('@s.whatsapp.net') && !jid.includes('status')
        );
        
        const groupIds = Object.keys(chats);
        const allChats = [...groupIds, ...privateChats];
        
        let success = 0;
        let failed = 0;

        const broadcastText = `
╭━━━❰ *BROADCAST* ❱━━━╮
┃
┃ 📢 *Pesan dari Owner:*
┃
┃ ${text}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        // Send to all chats
        for (const chatId of allChats) {
            try {
                await conn.sendMessage(chatId, {
                    text: broadcastText,
                    contextInfo: {
                        externalAdReply: {
                            title: "📢 BROADCAST",
                            body: "Pesan dari Owner",
                            thumbnailUrl: global.thumbnail || "https://files.catbox.moe/5x2b8n.jpg",
                            sourceUrl: "https://wa.me/62881027174423",
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                });
                success++;
                await new Promise(r => setTimeout(r, 1000)); // Delay 1s
            } catch (err) {
                failed++;
                console.error(`Failed to send to ${chatId}:`, err.message);
            }
        }

        const resultText = `
╭━━━❰ *BROADCAST SELESAI* ❱━━━╮
┃
┃ ✅ *Berhasil:* ${success} chat
┃ ❌ *Gagal:* ${failed} chat
┃ 📊 *Total:* ${allChats.length} chat
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const resultButtons = [
            ...button.flow.quickReply("📋 Menu", ".menuplug"),
            ...button.flow.quickReply("🗑️ Clear Chat", ".clearchat")
        ];

        return replyAdaptive({
            text: resultText,
            buttons: resultButtons,
            title: "Broadcast Complete",
            body: `Success: ${success}, Failed: ${failed}`
        });

    } catch (error) {
        console.error('Broadcast Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal mengirim broadcast'}`,
            title: "Error",
            body: "Broadcast Failed"
        });
    }
};

handler.command = ['broadcast', 'bc'];
handler.tags = ['owner'];
handler.help = ['broadcast <pesan>', 'bc <pesan>'];

module.exports = handler;
