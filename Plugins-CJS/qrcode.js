/**
 * Plugin: qrcode.js
 * Description: Generate QR Code dari teks/link
 * Command: .qrcode, .qr
 */

const axios = require('axios');

const handler = async (m, Obj) => {
    const { conn, q, button, text, replyAdaptive } = Obj;

    if (!text) {
        const helpText = `
╭━━━❰ *QR CODE GENERATOR* ❱━━━╮
┃
┃ 🔲 Generate QR Code
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .qrcode <teks/link>
┃ .qr <teks/link>
┃
┃ *Contoh:*
┃ .qrcode https://google.com
┃ .qr Halo Dunia
┃ .qr 081234567890
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("🔲 Contoh", ".qrcode https://google.com"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "QR Code Generator",
            body: "Generate QR Code"
        });
    }

    try {
        await conn.sendMessage(m.chat, {
            text: `🔲 Sedang generate QR Code...`
        }, { quoted: q('fkontak') });

        // Generate QR Code URL
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`;

        // Get QR image
        const qrBuffer = await axios.get(qrUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        // Send QR Code
        await conn.sendMessage(m.chat, {
            image: Buffer.from(qrBuffer.data),
            caption: `
╭━━━❰ *QR CODE* ❱━━━╮
┃
┃ 🔲 *Data:* ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}
┃
┃ ✅ QR Code berhasil dibuat!
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
            contextInfo: {
                externalAdReply: {
                    title: "QR Code Generator",
                    body: "Scan me!",
                    thumbnailUrl: global.thumbnail || "https://files.catbox.moe/5x2b8n.jpg",
                    sourceUrl: "https://wa.me/62881027174423",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: q('fkontak') });

    } catch (error) {
        console.error('QR Code Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal generate QR Code'}`,
            title: "Error",
            body: "QR Code Failed"
        });
    }
};

handler.command = ['qrcode', 'qr'];
handler.tags = ['create'];
handler.help = ['qrcode <teks/link>'];

module.exports = handler;
