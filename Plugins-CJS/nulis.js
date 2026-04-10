/**
 * Plugin: nulis.js
 * Description: Nulis teks ke gambar buku
 * Command: .nulis, .tulis
 */

const axios = require('axios');

const handler = async (m, Obj) => {
    const { conn, q, button, text, replyAdaptive } = Obj;

    if (!text) {
        const helpText = `
╭━━━❰ *NULIS* ❱━━━╮
┃
┃ 📝 Nulis teks ke gambar buku
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .nulis <teks>
┃ .tulis <teks>
┃
┃ *Contoh:*
┃ .nulis Halo semuanya!
┃ .nulis Belajar JavaScript itu menyenangkan
┃
┃ 💡 *Tips:*
┃ • Maksimal 500 karakter
┃ • Hasil lebih bagus dengan
┃   kalimat yang lengkap
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("📝 Contoh", ".nulis Halo semuanya!"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "Nulis",
            body: "Tulis ke gambar buku"
        });
    }

    if (text.length > 500) {
        return replyAdaptive({
            text: '❌ Teks terlalu panjang! Maksimal 500 karakter.',
            title: "Error",
            body: "Text Too Long"
        });
    }

    try {
        await conn.sendMessage(m.chat, {
            text: `📝 Sedang menulis, mohon tunggu...`
        }, { quoted: q('fkontak') });

        // Call nulis API
        const response = await axios.get(`https://api.ryzendesu.vip/api/canvas/nulis?text=${encodeURIComponent(text)}`, {
            timeout: 60000,
            responseType: 'arraybuffer'
        });

        if (!response.data) {
            throw new Error('No image data received');
        }

        const imageBuffer = Buffer.from(response.data);

        // Send image
        await conn.sendMessage(m.chat, {
            image: imageBuffer,
            caption: `
╭━━━❰ *HASIL TULISAN* ❱━━━╮
┃
┃ 📝 *Teks:* ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}
┃
┃ ✅ Berhasil ditulis!
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
            contextInfo: {
                externalAdReply: {
                    title: "Nulis",
                    body: "Tulisan di buku",
                    thumbnailUrl: global.thumbnail || "https://files.catbox.moe/5x2b8n.jpg",
                    sourceUrl: "https://wa.me/62881027174423",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: q('fkontak') });

    } catch (error) {
        console.error('Nulis Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal menulis'}`,
            title: "Error",
            body: "Nulis Failed"
        });
    }
};

handler.command = ['nulis', 'tulis', 'write'];
handler.tags = ['create'];
handler.help = ['nulis <teks>'];

module.exports = handler;
