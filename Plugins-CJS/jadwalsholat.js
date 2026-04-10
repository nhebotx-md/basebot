/**
 * Plugin: jadwalsholat.js
 * Description: Cek jadwal sholat kota
 * Command: .jadwalsholat, .sholat, .jadwal
 */

const axios = require('axios');

const handler = async (m, Obj) => {
    const { conn, q, button, text, replyAdaptive } = Obj;

    if (!text) {
        const helpText = `
╭━━━❰ *JADWAL SHOLAT* ❱━━━╮
┃
┃ 🕌 Cek jadwal sholat kota
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .sholat <nama kota>
┃ .jadwalsholat <kota>
┃
┃ *Contoh:*
┃ .sholat Jakarta
┃ .sholat Surabaya
┃ .sholat Bandung
┃ .sholat Yogyakarta
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("🕌 Jakarta", ".sholat Jakarta"),
            ...button.flow.quickReply("🕌 Surabaya", ".sholat Surabaya"),
            ...button.flow.quickReply("🕌 Bandung", ".sholat Bandung"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "Jadwal Sholat",
            body: "Prayer schedule"
        });
    }

    try {
        await conn.sendMessage(m.chat, {
            text: `🔍 Mencari jadwal sholat untuk *${text}*...`
        }, { quoted: q('fkontak') });

        // Call prayer API
        const response = await axios.get(`https://api.ryzendesu.vip/api/islam/jadwalshalat?kota=${encodeURIComponent(text)}`, {
            timeout: 30000
        });

        const data = response.data;
        
        if (!data || data.error) {
            throw new Error(data?.error || 'Kota tidak ditemukan');
        }

        const sholatText = `
╭━━━❰ *JADWAL SHOLAT* ❱━━━╮
┃
┃ 📍 *Kota:* ${data.kota || text}
┃ 📅 *Tanggal:* ${data.tanggal || new Date().toLocaleDateString('id-ID')}
┃
┃ 🌅 *Imsak:* ${data.imsak || 'N/A'}
┃ 🌄 *Subuh:* ${data.subuh || 'N/A'}
┃ ☀️ *Dzuhur:* ${data.dzuhur || 'N/A'}
┃ 🌇 *Ashar:* ${data.ashar || 'N/A'}
┃ 🌆 *Maghrib:* ${data.maghrib || 'N/A'}
┃ 🌃 *Isya:* ${data.isya || 'N/A'}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("🔄 Kota Lain", ".sholat "),
            ...button.flow.quickReply("📖 Surah", ".surah"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: sholatText,
            buttons: buttons,
            title: `Jadwal Sholat ${data.kota || text}`,
            body: data.tanggal || 'Prayer Schedule'
        });

    } catch (error) {
        console.error('Jadwal Sholat Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Kota tidak ditemukan'}\n\nSilakan coba dengan nama kota lain.`,
            title: "Error",
            body: "City Not Found"
        });
    }
};

handler.command = ['jadwalsholat', 'sholat', 'jadwal', 'solat'];
handler.tags = ['islam'];
handler.help = ['sholat <nama kota>'];

module.exports = handler;
