/**
 * Plugin: surah.js
 * Description: Baca surah Al-Quran
 * Command: .surah, .quran
 */

const axios = require('axios');

const surahList = [
    { nomor: 1, nama: 'Al-Fatihah', arti: 'Pembukaan', ayat: 7 },
    { nomor: 2, nama: 'Al-Baqarah', arti: 'Sapi', ayat: 286 },
    { nomor: 3, nama: 'Ali Imran', arti: 'Keluarga Imran', ayat: 200 },
    { nomor: 4, nama: 'An-Nisa', arti: 'Wanita', ayat: 176 },
    { nomor: 5, nama: 'Al-Ma\'idah', arti: 'Hidangan', ayat: 120 },
    { nomor: 6, nama: 'Al-An\'am', arti: 'Binatang Ternak', ayat: 165 },
    { nomor: 7, nama: 'Al-A\'raf', arti: 'Tempat Tertinggi', ayat: 206 },
    { nomor: 36, nama: 'Yasin', arti: 'Yasin', ayat: 83 },
    { nomor: 55, nama: 'Ar-Rahman', arti: 'Yang Maha Pengasih', ayat: 78 },
    { nomor: 56, nama: 'Al-Waqi\'ah', arti: 'Hari Kiamat', ayat: 96 },
    { nomor: 67, nama: 'Al-Mulk', arti: 'Kerajaan', ayat: 30 },
    { nomor: 112, nama: 'Al-Ikhlas', arti: 'Ikhlas', ayat: 4 },
    { nomor: 113, nama: 'Al-Falaq', arti: 'Waktu Subuh', ayat: 5 },
    { nomor: 114, nama: 'An-Nas', arti: 'Manusia', ayat: 6 }
];

const handler = async (m, Obj) => {
    const { conn, q, button, text, replyAdaptive } = Obj;

    // If no text, show list
    if (!text) {
        let listText = `
╭━━━❰ *DAFTAR SURAH* ❱━━━╮
┃
┃ 📖 Pilih surah untuk dibaca:
┃
`;

        surahList.forEach(surah => {
            listText += `┃ ${surah.nomor}. ${surah.nama} (${surah.arti})\n`;
        });

        listText += `┃\n┃ 💡 Ketik: .surah <nomor/nama>\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("📖 Yasin", ".surah 36"),
            ...button.flow.quickReply("📖 Al-Fatihah", ".surah 1"),
            ...button.flow.quickReply("📖 Ar-Rahman", ".surah 55"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: listText,
            buttons: buttons,
            title: "Daftar Surah",
            body: "Al-Quran"
        });
    }

    try {
        // Determine surah number
        let surahNumber = parseInt(text);
        if (isNaN(surahNumber)) {
            // Search by name
            const found = surahList.find(s => 
                s.nama.toLowerCase().includes(text.toLowerCase())
            );
            if (found) {
                surahNumber = found.nomor;
            } else {
                throw new Error('Surah tidak ditemukan');
            }
        }

        if (surahNumber < 1 || surahNumber > 114) {
            throw new Error('Nomor surah harus antara 1-114');
        }

        await conn.sendMessage(m.chat, {
            text: `📖 Sedang mengambil surah...`
        }, { quoted: q('fkontak') });

        // Get surah data from API
        const response = await axios.get(`https://api.ryzendesu.vip/api/islam/surah?no=${surahNumber}`, {
            timeout: 30000
        });

        const data = response.data;

        if (!data || data.error) {
            throw new Error(data?.error || 'Gagal mengambil data surah');
        }

        const surahData = data.data || data;
        const verses = surahData.ayahs || [];

        let surahText = `
╭━━━❰ *${surahData.name?.transliteration?.id || surahData.name || 'Surah'}* ❱━━━╮
┃
┃ 📖 *${surahData.name?.short || ''}*
┃ Arti: ${surahData.name?.translation?.id || 'Unknown'}
┃ Jumlah Ayat: ${surahData.numberOfVerses || verses.length}
┃
`;

        // Add verses (limit to first 10 for long surahs)
        const displayVerses = verses.length > 10 ? verses.slice(0, 10) : verses;
        
        displayVerses.forEach((ayah, i) => {
            const verseText = ayah.text?.arab || ayah.arab || '';
            const verseTranslation = ayah.text?.translation?.id || ayah.translation?.id || '';
            surahText += `┃ ${ayah.number?.inSurah || i + 1}. ${verseText.substring(0, 50)}${verseText.length > 50 ? '...' : ''}\n`;
            if (verseTranslation) {
                surahText += `┃    ${verseTranslation.substring(0, 50)}${verseTranslation.length > 50 ? '...' : ''}\n`;
            }
            surahText += `┃\n`;
        });

        if (verses.length > 10) {
            surahText += `┃ ... dan ${verses.length - 10} ayat lainnya\n┃\n`;
        }

        surahText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("⬅️ Surah Sebelumnya", `.surah ${surahNumber > 1 ? surahNumber - 1 : 114}`),
            ...button.flow.quickReply("➡️ Surah Selanjutnya", `.surah ${surahNumber < 114 ? surahNumber + 1 : 1}`),
            ...button.flow.quickReply("📋 Daftar Surah", ".surah"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: surahText,
            buttons: buttons,
            title: surahData.name?.transliteration?.id || 'Surah',
            body: surahData.name?.translation?.id || 'Al-Quran'
        });

    } catch (error) {
        console.error('Surah Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal mengambil surah'}`,
            title: "Error",
            body: "Surah Failed"
        });
    }
};

handler.command = ['surah', 'quran', 'bacaquran'];
handler.tags = ['islam'];
handler.help = ['surah <nomor/nama>'];

module.exports = handler;
