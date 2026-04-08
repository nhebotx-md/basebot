/**
 * Surah Al-Quran Plugin
 * Category: islammenu
 * Feature: Menampilkan surah Al-Quran dengan terjemahan
 */

const axios = require('axios')

// Daftar surah
const surahList = [
  { nomor: 1, nama: 'Al-Fatihah', arti: 'Pembuka', ayat: 7 },
  { nomor: 2, nama: 'Al-Baqarah', arti: 'Sapi Betina', ayat: 286 },
  { nomor: 3, nama: 'Ali Imran', arti: 'Keluarga Imran', ayat: 200 },
  { nomor: 4, nama: 'An-Nisa', arti: 'Wanita', ayat: 176 },
  { nomor: 5, nama: 'Al-Maidah', arti: 'Hidangan', ayat: 120 },
  { nomor: 6, nama: 'Al-Anam', arti: 'Binatang Ternak', ayat: 165 },
  { nomor: 7, nama: 'Al-Araf', arti: 'Tempat Tertinggi', ayat: 206 },
  { nomor: 8, nama: 'Al-Anfal', arti: 'Rampasan Perang', ayat: 75 },
  { nomor: 9, nama: 'At-Taubah', arti: 'Pengampunan', ayat: 129 },
  { nomor: 10, nama: 'Yunus', arti: 'Yunus', ayat: 109 },
  { nomor: 36, nama: 'Yasin', arti: 'Yasin', ayat: 83 },
  { nomor: 55, nama: 'Ar-Rahman', arti: 'Yang Maha Pemurah', ayat: 78 },
  { nomor: 67, nama: 'Al-Mulk', arti: 'Kerajaan', ayat: 30 },
  { nomor: 112, nama: 'Al-Ikhlas', arti: 'Ikhlas', ayat: 4 },
  { nomor: 113, nama: 'Al-Falaq', arti: 'Waktu Subuh', ayat: 5 },
  { nomor: 114, nama: 'An-Nas', arti: 'Manusia', ayat: 6 }
]

const handler = async (m, Obj) => {
  const { conn, q, args, text, button } = Obj

  if (!text) {
    // Tampilkan daftar surah
    const surahMenu = surahList.map(s => 
      `│ ${s.nomor}. *${s.nama}* (${s.arti}) - ${s.ayat} ayat`
    ).join('\n')

    return conn.sendMessage(m.chat, {
      text: `
╭───〔 *DAFTAR SURAH* 〕───╮
│
${surahMenu}
│
├────────────────────────
│
│ 📋 *Cara Penggunaan:*
│
│ • .surah [nomor surah]
│ • .surah [nama surah]
│
│ 📌 *Contoh:*
│ • .surah 1
│ • .surah Yasin
│ • .surah Al-Fatihah
│
╰────────────────────────╯
      `.trim(),
      footer: "Al-Quran Digital",
      interactiveButtons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "📖 Pilih Surah",
            sections: [{
              title: "Surah Populer",
              rows: [
                { title: "📖 Al-Fatihah", description: "Pembuka - 7 ayat", id: ".surah 1" },
                { title: "📖 Yasin", description: "Yasin - 83 ayat", id: ".surah 36" },
                { title: "📖 Ar-Rahman", description: "Yang Maha Pemurah - 78 ayat", id: ".surah 55" },
                { title: "📖 Al-Mulk", description: "Kerajaan - 30 ayat", id: ".surah 67" },
                { title: "📖 Al-Ikhlas", description: "Ikhlas - 4 ayat", id: ".surah 112" },
                { title: "📖 Al-Falaq", description: "Waktu Subuh - 5 ayat", id: ".surah 113" },
                { title: "📖 An-Nas", description: "Manusia - 6 ayat", id: ".surah 114" }
              ]
            }]
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: `📖 Sedang mengambil data surah...`
    }, { quoted: q('fkontak') })

    // Cek apakah input adalah nomor atau nama
    const nomorSurah = parseInt(text)
    let url

    if (!isNaN(nomorSurah) && nomorSurah >= 1 && nomorSurah <= 114) {
      url = `https://equran.id/api/v2/surat/${nomorSurah}`
    } else {
      // Cari berdasarkan nama
      const found = surahList.find(s => s.nama.toLowerCase().includes(text.toLowerCase()))
      if (found) {
        url = `https://equran.id/api/v2/surat/${found.nomor}`
      } else {
        throw new Error('Surah tidak ditemukan')
      }
    }

    const response = await axios.get(url, { timeout: 30000 })
    
    if (!response.data || !response.data.data) {
      throw new Error('Data tidak ditemukan')
    }

    const surah = response.data.data
    const ayat = surah.ayat.slice(0, 10) // Ambil 10 ayat pertama

    let ayatText = ayat.map((a, i) => 
      `│
│ *${a.nomorAyat}.* ${a.teksArab}
│ _${a.teksLatin}_
│ "${a.teksIndonesia}"
│`
    ).join('\n')

    if (surah.ayat.length > 10) {
      ayatText += `\n│\n│ ... dan ${surah.ayat.length - 10} ayat lainnya`
    }

    const surahText = `
╭───〔 *${surah.namaLatin}* 〕───╮
│
│ 📖 *${surah.nama}*
│ 📝 ${surah.arti}
│
│ 📊 Info:
│ • Nomor: ${surah.nomor}
│ • Jumlah Ayat: ${surah.jumlahAyat}
│ • Tempat Turun: ${surah.tempatTurun}
│ • Audio: ${surah.audioFull['05'] ? 'Tersedia' : 'Tidak tersedia'}
│
├────────────────────────
${ayatText}
│
╰────────────────────────╯
    `.trim()

    // Kirim teks surah
    await conn.sendMessage(m.chat, {
      text: surahText,
      footer: "Al-Quran Digital",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "▶️ Audio Full",
            id: `.quranaudio ${surah.nomor}`
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📖 Surah Lain",
            id: ".surah"
          })
        }
      ]
    }, { quoted: q('fkontak') })

    // Kirim audio jika tersedia
    if (surah.audioFull && surah.audioFull['05']) {
      try {
        await conn.sendMessage(m.chat, {
          audio: { url: surah.audioFull['05'] },
          mimetype: 'audio/mpeg',
          fileName: `${surah.namaLatin}.mp3`,
          contextInfo: {
            externalAdReply: {
              title: surah.namaLatin,
              body: `${surah.jumlahAyat} Ayat - ${surah.arti}`,
              thumbnailUrl: 'https://files.catbox.moe/5x2b8n.jpg',
              mediaType: 2
            }
          }
        }, { quoted: m })
      } catch (audioErr) {
        console.error("Audio Error:", audioErr)
      }
    }

  } catch (err) {
    console.error("Surah Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Surah tidak ditemukan!\n\nGunakan .surah untuk melihat daftar."
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['surah', 'quran', 'alquran']
handler.tags = ['islammenu']
handler.command = ["surah", "quran", "alquran", "bacaquran"]

module.exports = handler
