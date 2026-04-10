/**
 * Plugin: stickermeme.js
 * Description: Meme sticker generator
 * Command: .stickermeme, .smeme
 */

const axios = require('axios');

const handler = async (m, Obj) => {
    const { conn, q, button, text, replyAdaptive, quoted } = Obj;

    // Check if quoted message has image
    const isImage = quoted && (quoted.mtype === 'imageMessage' || quoted.mtype === 'viewOnceMessage');

    if (!isImage) {
        const helpText = `
╭━━━❰ *STICKER MEME* ❱━━━╮
┃
┃ 😂 Buat meme sticker
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ 1. Kirim/reply gambar dengan caption:
┃    .smeme <teks atas> | <teks bawah>
┃
┃ *Contoh:*
┃ [reply gambar]
┃ .smeme When you | realize it's Monday
┃
┃ 💡 *Tips:*
┃ • Pisahkan teks atas dan bawah dengan |
┃ • Gunakan gambar dengan resolusi tinggi
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("🏷️ Sticker WM", ".stickerwm"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "Sticker Meme",
            body: "Meme generator"
        });
    }

    if (!text) {
        return replyAdaptive({
            text: '❌ Masukkan teks meme!\n\nFormat: .smeme <teks atas> | <teks bawah>',
            title: "Error",
            body: "Text Required"
        });
    }

    try {
        await conn.sendMessage(m.chat, {
            text: `😂 Sedang membuat meme sticker...`
        }, { quoted: q('fkontak') });

        // Download image
        const imageBuffer = await quoted.download();
        if (!imageBuffer) {
            throw new Error('Failed to download image');
        }

        // Parse text
        const parts = text.split('|').map(s => s.trim());
        const topText = parts[0] || '';
        const bottomText = parts[1] || '';

        // Upload image to get URL (using catbox or similar)
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', imageBuffer, 'image.jpg');

        const uploadResponse = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            params: { reqtype: 'fileupload' },
            timeout: 60000
        });

        const imageUrl = uploadResponse.data;

        // Generate meme
        const memeUrl = `https://api.memegen.link/images/custom/${encodeURIComponent(topText)}/${encodeURIComponent(bottomText)}.png?background=${encodeURIComponent(imageUrl)}`;

        const memeBuffer = await axios.get(memeUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        // Convert to webp and send as sticker
        const { writeExifImg } = require('../Library/uploader');
        const webpBuffer = await writeExifImg(Buffer.from(memeBuffer.data), {
            packname: global.botname || 'NHE BOT',
            author: global.namaowner || 'Owner'
        });

        await conn.sendMessage(m.chat, {
            sticker: webpBuffer
        }, { quoted: q('fkontak') });

    } catch (error) {
        console.error('Sticker Meme Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal membuat meme sticker'}`,
            title: "Error",
            body: "Meme Sticker Failed"
        });
    }
};

handler.command = ['stickermeme', 'smeme', 'memesticker'];
handler.tags = ['sticker'];
handler.help = ['stickermeme <teks atas> | <teks bawah> (reply gambar)'];

module.exports = handler;
