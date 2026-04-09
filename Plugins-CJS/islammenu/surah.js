/**
 * Plugin: surah.js
 * Description: Baca surah Al-Quran
 * Command: .surah, .quran
 */

const axios = require('axios')

const handler = async (m, Obj) => {
  const { conn, q, button, text, args } = Obj

  if (!text) {
    const helpText = `
╭━━━❰ *AL-QURAN* ❱━━━╮
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .surah NomorSurah
┃ .surah NamaSurah
┃ .quran NomorSurah:Ayat
┃
┃ *Contoh:*
┃ .surah 1 (Al-Fatihah)
┃ .surah Al-Baqarah
┃ .quran 2:255 (Ayat Kursi)
┃
┃ 📖 *Daftar Surah Populer:*
┃ • 1. Al-Fatihah
┃ • 2. Al-Baqarah
┃ • 36. Yasin
┃ • 55. Ar-Rahman
┃ • 67. Al-Mulk
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const sections = [
      {
        title: "Surah Populer",
        rows: [
          { title: "📖 Al-Fatihah", description: "Surah pembuka", id: ".surah 1" },
          { title: "📖 Al-Baqarah", description: "Surah terpanjang", id: ".surah 2" },
          { title: "📖 Yasin", description: "Surah Yasin", id: ".surah 36" },
          { title: "📖 Ar-Rahman", description: "Surah Ar-Rahman", id: ".surah 55" },
          { title: "📖 Al-Mulk", description: "Surah Al-Mulk", id: ".surah 67" },
          { title: "📖 Al-Ikhlas", description: "Surah Al-Ikhlas", id: ".surah 112" }
        ]
      }
    ]

    const buttons = [
      ...button.flow.singleSelect("📖 Pilih Surah", sections),
      ...button.flow.quickReply("🕌 Jadwal Sholat", ".sholat Jakarta"),
      ...button.flow.quickReply("✨ Asmaul Husna", ".asmaulhusna"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "Al-Quran",
      body: "Baca surah Al-Quran"
    })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: `📖 Mencari surah...`
    }, { quoted: q('fkontak') })

    let surahNumber, ayatNumber

    // Check if format is Surah:Ayat
    if (text.includes(':')) {
      [surahNumber, ayatNumber] = text.split(':').map(n => parseInt(n.trim()))
    } else {
      // Check if text is a number
      const num = parseInt(text)
      if (!isNaN(num)) {
        surahNumber = num
      }
    }

    let apiUrl
    if (surahNumber && ayatNumber) {
      // Get specific ayat
      apiUrl = `https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayatNumber}/editions/quran-simple,id.indonesian`
    } else if (surahNumber) {
      // Get full surah
      apiUrl = `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-simple,id.indonesian`
    } else {
      // Search by name
      const searchUrl = `https://api.alquran.cloud/v1/surah`
      const searchRes = await axios.get(searchUrl)
      const surahList = searchRes.data.data
      
      const found = surahList.find(s => 
        s.englishName.toLowerCase().includes(text.toLowerCase()) ||
        s.name.includes(text) ||
        s.englishNameTranslation.toLowerCase().includes(text.toLowerCase())
      )
      
      if (!found) {
        throw new Error('Surah tidak ditemukan')
      }
      
      surahNumber = found.number
      apiUrl = `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-simple,id.indonesian`
    }

    const response = await axios.get(apiUrl)
    const data = response.data.data

    if (ayatNumber) {
      // Single ayat
      const arabic = data[0]
      const translation = data[1]

      const ayatText = `
╭━━━❰ *${arabic.surah.englishName}* ❱━━━╮
┃
┃ 📖 *Surah:* ${arabic.surah.name} (${arabic.surah.englishName})
┃ 🔢 *Ayat:* ${arabic.numberInSurah}
┃
┃ 🕌 *Arab:*
┃ ${arabic.text}
┃
┃ 🇮🇩 *Terjemahan:*
┃ ${translation.text}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

      const buttons = [
        ...button.flow.quickReply("📖 Surah Lengkap", `.surah ${surahNumber}`),
        ...button.flow.quickReply("📖 Ayat Sebelumnya", `.quran ${surahNumber}:${ayatNumber - 1}`),
        ...button.flow.quickReply("📖 Ayat Selanjutnya", `.quran ${surahNumber}:${ayatNumber + 1}`),
        ...button.flow.quickReply("📋 Menu", ".menuplug")
      ]

      await button.sendInteractive(ayatText, buttons, {
        title: `${arabic.surah.englishName} : ${arabic.numberInSurah}`,
        body: arabic.surah.englishNameTranslation
      })
    } else {
      // Full surah
      const arabic = data[0]
      const translation = data[1]

      let surahText = `
╭━━━❰ *${arabic.englishName}* ❱━━━╮
┃
┃ 📖 *${arabic.name}*
┃ 📝 ${arabic.englishName}
┃ 🌍 ${arabic.englishNameTranslation}
┃ 🔢 Jumlah Ayat: ${arabic.numberOfAyahs}
┃ 🏳️ ${arabic.revelationType === 'Meccan' ? 'Makkiyah' : 'Madaniyah'}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

`

      // Send first few ayats
      const maxAyats = Math.min(arabic.ayahs.length, 10)
      for (let i = 0; i < maxAyats; i++) {
        surahText += `${arabic.ayahs[i].text} *{${arabic.ayahs[i].numberInSurah}}*\n\n`
      }

      if (arabic.ayahs.length > 10) {
        surahText += `\n_...dan ${arabic.ayahs.length - 10} ayat lainnya_`
      }

      const buttons = [
        ...button.flow.quickReply("📖 Baca Lengkap", `.quran ${surahNumber}:1`),
        ...button.flow.quickReply("🕌 Jadwal Sholat", ".sholat Jakarta"),
        ...button.flow.quickReply("✨ Asmaul Husna", ".asmaulhusna"),
        ...button.flow.quickReply("📋 Menu", ".menuplug")
      ]

      await conn.sendMessage(m.chat, {
        text: surahText
      }, { quoted: m })

      await button.sendInteractive(`✅ *${arabic.englishName}* berhasil dikirim!`, buttons, {
        title: arabic.englishName,
        body: `${arabic.numberOfAyahs} ayat`
      })
    }

  } catch (err) {
    console.error("Surah Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal mengambil data: " + err.message + "\n\nCoba dengan nomor surah (1-114)"
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['surah']
handler.tags = ['islam']
handler.command = ['surah', 'quran', 'alquran']

module.exports = handler
