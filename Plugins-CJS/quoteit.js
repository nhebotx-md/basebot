/**
 * Plugin: quoteit.js
 * Description: Quote maker aesthetic
 * Command: .quote, .quoteit
 */

const axios = require('axios');

const handler = async (m, Obj) => {
    const { conn, q, button, text, replyAdaptive } = Obj;

    if (!text) {
        const helpText = `
╭━━━❰ *QUOTE MAKER* ❱━━━╮
┃
┃ 💬 Buat quote aesthetic
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .quote <teks> | <author>
┃ .quoteit <teks> | <author>
┃
┃ *Contoh:*
┃ .quote Hidup ini indah | Anonymous
┃ .quote Jangan menyerah | Pepatah
┃
┃ 💡 *Tips:*
┃ • Pisahkan teks dan author dengan |
┃ • Jika tidak ada author, akan
┃   menggunakan "Anonymous"
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("💬 Contoh", ".quote Hidup ini indah | Anonymous"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "Quote Maker",
            body: "Create aesthetic quotes"
        });
    }

    try {
        await conn.sendMessage(m.chat, {
            text: `💬 Sedang membuat quote...`
        }, { quoted: q('fkontak') });

        // Parse input
        const parts = text.split('|').map(s => s.trim());
        const quoteText = parts[0];
        const author = parts[1] || 'Anonymous';

        // Generate quote using API
        const quoteUrl = `https://api.ryzendesu.vip/api/canvas/quote?text=${encodeURIComponent(quoteText)}&author=${encodeURIComponent(author)}`;

        const quoteBuffer = await axios.get(quoteUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        // Send quote image
        await conn.sendMessage(m.chat, {
            image: Buffer.from(quoteBuffer.data),
            caption: `
╭━━━❰ *QUOTE* ❱━━━╮
┃
┃ 💬 *"${quoteText}"*
┃
┃ — *${author}*
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
            contextInfo: {
                externalAdReply: {
                    title: "Quote Maker",
                    body: `By ${author}`,
                    thumbnailUrl: global.thumbnail || "https://files.catbox.moe/5x2b8n.jpg",
                    sourceUrl: "https://wa.me/62881027174423",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: q('fkontak') });

    } catch (error) {
        console.error('Quote Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal membuat quote'}`,
            title: "Error",
            body: "Quote Failed"
        });
    }
};

handler.command = ['quote', 'quoteit', 'quotes'];
handler.tags = ['create'];
handler.help = ['quote <teks> | <author>'];

module.exports = handler;
