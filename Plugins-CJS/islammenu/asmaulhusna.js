/**
 * Plugin: asmaulhusna.js
 * Description: 99 Nama Allah (Asmaul Husna)
 * Command: .asmaulhusna, .asmaul
 */

const axios = require('axios')

// Asmaul Husna data
const asmaulHusnaData = [
  { number: 1, latin: "Ar Rahman", arabic: "الرحمن", translation: "Yang Maha Pengasih" },
  { number: 2, latin: "Ar Rahiim", arabic: "الرحيم", translation: "Yang Maha Penyayang" },
  { number: 3, latin: "Al Malik", arabic: "الملك", translation: "Yang Maha Merajai" },
  { number: 4, latin: "Al Quddus", arabic: "القدوس", translation: "Yang Maha Suci" },
  { number: 5, latin: "As Salaam", arabic: "السلام", translation: "Yang Maha Memberi Kesejahteraan" },
  { number: 6, latin: "Al Mu'min", arabic: "المؤمن", translation: "Yang Maha Memberi Keamanan" },
  { number: 7, latin: "Al Muhaimin", arabic: "المهيمن", translation: "Yang Maha Pemelihara" },
  { number: 8, latin: "Al 'Aziiz", arabic: "العزيز", translation: "Yang Maha Perkasa" },
  { number: 9, latin: "Al Jabbar", arabic: "الجبار", translation: "Yang Maha Perkasa" },
  { number: 10, latin: "Al Mutakabbir", arabic: "المتكبر", translation: "Yang Maha Megah" },
  // Add more as needed
]

const handler = async (m, Obj) => {
  const { conn, q, button, text, args } = Obj

  // If specific number requested
  if (text && !isNaN(parseInt(text))) {
    const num = parseInt(text)
    if (num < 1 || num > 99) {
      return conn.sendMessage(m.chat, {
        text: "❌ Nomor harus antara 1-99!"
      }, { quoted: q('fkontak') })
    }

    try {
      const apiUrl = `https://api.alquran.cloud/v1/asmaAlHusna/${num}`
      const response = await axios.get(apiUrl)
      const data = response.data.data[0]

      const asmaText = `
╭━━━❰ *ASMAUL HUSNA* ❱━━━╮
┃
┃ 🔢 *Nomor:* ${data.number}
┃
┃ 🕌 *Arab:*
┃ ${data.name}
┃
┃ 📝 *Latin:*
┃ ${data.transliteration}
┃
┃ 🇮🇩 *Arti:*
┃ ${data.en.meaning}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

      const buttons = [
        ...button.flow.quickReply(`⬅️ #${num - 1}`, `.asmaulhusna ${num - 1}`),
        ...button.flow.quickReply(`➡️ #${num + 1}`, `.asmaulhusna ${num + 1}`),
        ...button.flow.quickReply("📖 Semua", ".asmaulhusna all"),
        ...button.flow.quickReply("📋 Menu", ".menuplug")
      ]

      return button.sendInteractive(asmaText, buttons, {
        title: `Asmaul Husna #${num}`,
        body: data.transliteration
      })
    } catch (err) {
      // Use local data as fallback
      const localData = asmaulHusnaData.find(a => a.number === num)
      if (localData) {
        const asmaText = `
╭━━━❰ *ASMAUL HUSNA* ❱━━━╮
┃
┃ 🔢 *Nomor:* ${localData.number}
┃
┃ 🕌 *Arab:*
┃ ${localData.arabic}
┃
┃ 📝 *Latin:*
┃ ${localData.latin}
┃
┃ 🇮🇩 *Arti:*
┃ ${localData.translation}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

        const buttons = [
          ...button.flow.quickReply(`⬅️ #${num - 1}`, `.asmaulhusna ${num - 1}`),
          ...button.flow.quickReply(`➡️ #${num + 1}`, `.asmaulhusna ${num + 1}`),
          ...button.flow.quickReply("📋 Menu", ".menuplug")
        ]

        return button.sendInteractive(asmaText, buttons, {
          title: `Asmaul Husna #${num}`,
          body: localData.latin
        })
      }
    }
  }

  // Show all or menu
  if (text === 'all') {
    try {
      const apiUrl = `https://api.alquran.cloud/v1/asmaAlHusna`
      const response = await axios.get(apiUrl)
      const data = response.data.data

      let allText = `
╭━━━❰ *99 ASMAUL HUSNA* ❱━━━╮
┃
┃ 🕌 99 Nama Allah SWT
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

`

      // Show first 20
      for (let i = 0; i < Math.min(20, data.length); i++) {
        allText += `${data[i].number}. ${data[i].name} - ${data[i].transliteration}\n`
      }

      allText += `\n_...dan ${data.length - 20} nama lainnya_`
      allText += `\n\nKetik .asmaulhusna [nomor] untuk detail`

      const buttons = [
        ...button.flow.quickReply("1-10", ".asmaulhusna 1"),
        ...button.flow.quickReply("11-20", ".asmaulhusna 11"),
        ...button.flow.quickReply("21-30", ".asmaulhusna 21"),
        ...button.flow.quickReply("📋 Menu", ".menuplug")
      ]

      return button.sendInteractive(allText, buttons, {
        title: "99 Asmaul Husna",
        body: "Nama-nama Allah SWT"
      })
    } catch (err) {
      // Fallback
    }
  }

  // Default menu
  const menuText = `
╭━━━❰ *ASMAUL HUSNA* ❱━━━╮
┃
┃ 🕌 99 Nama Allah SWT
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .asmaulhusna [nomor]
┃ .asmaulhusna all
┃
┃ *Contoh:*
┃ .asmaulhusna 1
┃ .asmaulhusna 99
┃ .asmaulhusna all
┃
┃ 📖 *Contoh Nama:*
┃ • 1. Ar-Rahman
┃ • 2. Ar-Rahiim
┃ • 3. Al-Malik
┃ • 4. Al-Quddus
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

  const sections = [
    {
      title: "Asmaul Husna",
      rows: [
        { title: "🕌 #1 Ar-Rahman", description: "Yang Maha Pengasih", id: ".asmaulhusna 1" },
        { title: "🕌 #2 Ar-Rahiim", description: "Yang Maha Penyayang", id: ".asmaulhusna 2" },
        { title: "🕌 #3 Al-Malik", description: "Yang Maha Merajai", id: ".asmaulhusna 3" },
        { title: "🕌 #4 Al-Quddus", description: "Yang Maha Suci", id: ".asmaulhusna 4" },
        { title: "🕌 #5 As-Salaam", description: "Yang Maha Memberi Kesejahteraan", id: ".asmaulhusna 5" },
        { title: "📖 Lihat Semua", description: "Tampilkan 99 nama", id: ".asmaulhusna all" }
      ]
    }
  ]

  const buttons = [
    ...button.flow.singleSelect("🕌 Pilih Nama", sections),
    ...button.flow.quickReply("📖 Surah", ".surah"),
    ...button.flow.quickReply("🕌 Jadwal Sholat", ".sholat Jakarta"),
    ...button.flow.quickReply("📋 Menu", ".menuplug")
  ]

  await button.sendInteractive(menuText, buttons, {
    title: "Asmaul Husna",
    body: "99 Nama Allah SWT"
  })
}

handler.help = ['asmaulhusna']
handler.tags = ['islam']
handler.command = ['asmaulhusna', 'asmaul', 'asmaulhusna']

module.exports = handler
