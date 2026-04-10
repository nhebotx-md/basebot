/**
 * Plugin: stickerwm.js
 * Description: Sticker dengan watermark
 * Command: .stickerwm, .swm
 */

const { writeExifImg, writeExifVid } = require('../Library/uploader');

const handler = async (m, Obj) => {
    const { conn, q, button, text, replyAdaptive, quoted } = Obj;

    // Check if quoted message has image/video
    const isImage = quoted && (quoted.mtype === 'imageMessage' || quoted.mtype === 'viewOnceMessage');
    const isVideo = quoted && (quoted.mtype === 'videoMessage');

    if (!isImage && !isVideo) {
        const helpText = `
╭━━━❰ *STICKER WM* ❱━━━╮
┃
┃ 🏷️ Sticker dengan watermark
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ 1. Kirim/reply gambar/video dengan caption:
┃    .swm <packname> | <author>
┃
┃ *Contoh:*
┃ [reply gambar]
┃ .swm My Sticker | By Me
┃
┃ 💡 *Tips:*
┃ • Default packname: NHE BOT
┃ • Default author: Owner
┃ • Maksimal video 10 detik
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("😂 Meme Sticker", ".stickermeme"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "Sticker WM",
            body: "Sticker with watermark"
        });
    }

    try {
        await conn.sendMessage(m.chat, {
            text: `🏷️ Sedang membuat sticker...`
        }, { quoted: q('fkontak') });

        // Parse watermark text
        const parts = text.split('|').map(s => s.trim());
        const packname = parts[0] || global.botname || 'NHE BOT';
        const author = parts[1] || global.namaowner || 'Owner';

        // Download media
        const mediaBuffer = await quoted.download();
        if (!mediaBuffer) {
            throw new Error('Failed to download media');
        }

        let webpBuffer;

        if (isImage) {
            webpBuffer = await writeExifImg(mediaBuffer, { packname, author });
        } else {
            webpBuffer = await writeExifVid(mediaBuffer, { packname, author });
        }

        // Send sticker
        await conn.sendMessage(m.chat, {
            sticker: webpBuffer
        }, { quoted: q('fkontak') });

    } catch (error) {
        console.error('Sticker WM Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal membuat sticker'}`,
            title: "Error",
            body: "Sticker WM Failed"
        });
    }
};

handler.command = ['stickerwm', 'swm', 'wm'];
handler.tags = ['sticker'];
handler.help = ['stickerwm <packname> | <author> (reply media)'];

module.exports = handler;
