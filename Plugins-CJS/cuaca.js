/**
 * Plugin: cuaca.js
 * Description: Cek info cuaca kota
 * Command: .cuaca, .weather
 */

const axios = require('axios');

const handler = async (m, Obj) => {
    const { conn, q, button, text, replyAdaptive } = Obj;

    if (!text) {
        const helpText = `
╭━━━❰ *CUACA* ❱━━━╮
┃
┃ 🌤️ Cek info cuaca kota
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .cuaca <nama kota>
┃ .weather <city name>
┃
┃ *Contoh:*
┃ .cuaca Jakarta
┃ .cuaca Surabaya
┃ .cuaca Bandung
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("🌤️ Jakarta", ".cuaca Jakarta"),
            ...button.flow.quickReply("🌤️ Surabaya", ".cuaca Surabaya"),
            ...button.flow.quickReply("🌤️ Bandung", ".cuaca Bandung"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "Weather Info",
            body: "Check city weather"
        });
    }

    try {
        await conn.sendMessage(m.chat, {
            text: `🔍 Mencari info cuaca untuk *${text}*...`
        }, { quoted: q('fkontak') });

        // Call weather API
        const response = await axios.get(`https://api.ryzendesu.vip/api/info/cuaca?kota=${encodeURIComponent(text)}`, {
            timeout: 30000
        });

        const data = response.data;
        
        if (!data || data.error) {
            throw new Error(data?.error || 'Kota tidak ditemukan');
        }

        const weatherText = `
╭━━━❰ *INFO CUACA* ❱━━━╮
┃
┃ 📍 *Kota:* ${data.kota || text}
┃
┃ 🌡️ *Suhu:* ${data.suhu || 'N/A'}
┃ 💧 *Kelembaban:* ${data.kelembaban || 'N/A'}
┃ 💨 *Angin:* ${data.angin || 'N/A'}
┃ 👁️ *Visibilitas:* ${data.visibilitas || 'N/A'}
┃ ☀️ *UV Index:* ${data.uv || 'N/A'}
┃ 🌅 *Sunrise:* ${data.sunrise || 'N/A'}
┃ 🌇 *Sunset:* ${data.sunset || 'N/A'}
┃
┃ 📝 *Kondisi:*
┃ ${data.kondisi || 'N/A'}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("🔄 Cari Lagi", ".cuaca "),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: weatherText,
            buttons: buttons,
            title: `Cuaca ${data.kota || text}`,
            body: data.kondisi || 'Weather Info'
        });

    } catch (error) {
        console.error('Weather Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Kota tidak ditemukan'}\n\nSilakan coba dengan nama kota lain.`,
            title: "Error",
            body: "City Not Found"
        });
    }
};

handler.command = ['cuaca', 'weather', 'cuacaku'];
handler.tags = ['info'];
handler.help = ['cuaca <nama kota>'];

module.exports = handler;
