/**
 * Asmaul Husna Plugin
 * Category: islammenu
 * Feature: Menampilkan 99 nama-nama Allah
 */

const axios = require('axios')

// Data asmaul husna (sebagian)
const asmaulHusnaData = [
  { urutan: 1, latin: 'Ar Rahman', arab: 'الرحمن', artiIndonesia: 'Yang Maha Pengasih' },
  { urutan: 2, latin: 'Ar Rahiim', arab: 'الرحيم', artiIndonesia: 'Yang Maha Penyayang' },
  { urutan: 3, latin: 'Al Malik', arab: 'الملك', artiIndonesia: 'Yang Maha Merajai' },
  { urutan: 4, latin: 'Al Quddus', arab: 'القدوس', artiIndonesia: 'Yang Maha Suci' },
  { urutan: 5, latin: 'As Salaam', arab: 'السلام', artiIndonesia: 'Yang Maha Memberi Kesejahteraan' },
  { urutan: 6, latin: 'Al Mu`min', arab: 'المؤمن', artiIndonesia: 'Yang Maha Memberi Keamanan' },
  { urutan: 7, latin: 'Al Muhaimin', arab: 'المهيمن', artiIndonesia: 'Yang Maha Pemelihara' },
  { urutan: 8, latin: 'Al `Aziiz', arab: 'العزيز', artiIndonesia: 'Yang Maha Perkasa' },
  { urutan: 9, latin: 'Al Jabbar', arab: 'الجبار', artiIndonesia: 'Yang Maha Pemaksa' },
  { urutan: 10, latin: 'Al Mutakabbir', arab: 'المتكبر', artiIndonesia: 'Yang Maha Megah' },
  { urutan: 11, latin: 'Al Khaliq', arab: 'الخالق', artiIndonesia: 'Yang Maha Pencipta' },
  { urutan: 12, latin: 'Al Baari`', arab: 'البارئ', artiIndonesia: 'Yang Maha Melepaskan' },
  { urutan: 13, latin: 'Al Mushawwir', arab: 'المصور', artiIndonesia: 'Yang Maha Membentuk Rupa' },
  { urutan: 14, latin: 'Al Ghaffaar', arab: 'الغفار', artiIndonesia: 'Yang Maha Pengampun' },
  { urutan: 15, latin: 'Al Qahhaar', arab: 'القهار', artiIndonesia: 'Yang Maha Menundukkan' },
  { urutan: 16, latin: 'Al Wahhaab', arab: 'الوهاب', artiIndonesia: 'Yang Maha Pemberi Karunia' },
  { urutan: 17, latin: 'Ar Razzaaq', arab: 'الرزاق', artiIndonesia: 'Yang Maha Pemberi Rezeki' },
  { urutan: 18, latin: 'Al Fattaah', arab: 'الفتاح', artiIndonesia: 'Yang Maha Pembuka Rahmat' },
  { urutan: 19, latin: 'Al `Aliim', arab: 'العليم', artiIndonesia: 'Yang Maha Mengetahui' },
  { urutan: 20, latin: 'Al Qaabidh', arab: 'القابض', artiIndonesia: 'Yang Maha Menyempitkan' }
]

const handler = async (m, Obj) => {
  const { conn, q, args, text, button } = Obj

  const action = text?.toLowerCase()

  if (action === 'all' || action === 'semua') {
    // Tampilkan semua 99 asmaul husna
    try {
      const response = await axios.get('https://api.npoint.io/99c463bb7a0a7ea21d64', { timeout: 30000 })
      
      if (response.data && response.data.data) {
        const allAsma = response.data.data
        
        // Kirim dalam beberapa bagian karena panjang
        const chunkSize = 33
        for (let i = 0; i < allAsma.length; i += chunkSize) {
          const chunk = allAsma.slice(i, i + chunkSize)
          const asmaText = chunk.map(a => 
            `│ *${a.urutan}.* ${a.arab}\n│ _${a.latin}_ - ${a.artiIndonesia}`
          ).join('\n│\n')

          await conn.sendMessage(m.chat, {
            text: `
╭───〔 *ASMAUL HUSNA ${i + 1}-${Math.min(i + chunkSize, 99)}* 〕───╮
│
${asmaText}
│
╰────────────────────────────╯
            `.trim()
          }, { quoted: q('fkontak') })
        }
      }
    } catch (err) {
      // Fallback: tampilkan data lokal
      const asmaText = asmaulHusnaData.map(a => 
        `│ *${a.urutan}.* ${a.arab}\n│ _${a.latin}_ - ${a.artiIndonesia}`
      ).join('\n│\n')

      await conn.sendMessage(m.chat, {
        text: `
╭───〔 *ASMAUL HUSNA (1-20)* 〕───╮
│
${asmaText}
│
│ ... dan 79 nama lainnya
│
╰────────────────────────────╯
        `.trim()
      }, { quoted: q('fkontak') })
    }

  } else if (!isNaN(parseInt(action)) && parseInt(action) >= 1 && parseInt(action) <= 99) {
    // Tampilkan asmaul husna spesifik
    const nomor = parseInt(action)
    
    try {
      const response = await axios.get('https://api.npoint.io/99c463bb7a0a7ea21d64', { timeout: 30000 })
      
      if (response.data && response.data.data) {
        const asma = response.data.data.find(a => a.urutan === nomor)
        
        if (asma) {
          await conn.sendMessage(m.chat, {
            text: `
╭───〔 *ASMAUL HUSNA ${nomor}* 〕───╮
│
│ ${asma.arab}
│
│ *${asma.latin}*
│
│ Arti:
│ ${asma.artiIndonesia}
│
╰────────────────────────────╯
            `.trim(),
            footer: "Asmaul Husna",
            interactiveButtons: [
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "⬅️ Sebelumnya",
                  id: `.asmaulhusna ${nomor > 1 ? nomor - 1 : 99}`
                })
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "➡️ Selanjutnya",
                  id: `.asmaulhusna ${nomor < 99 ? nomor + 1 : 1}`
                })
              }
            ]
          }, { quoted: q('fkontak') })
        }
      }
    } catch {
      // Fallback
      const asma = asmaulHusnaData.find(a => a.urutan === nomor) || asmaulHusnaData[0]
      
      await conn.sendMessage(m.chat, {
        text: `
╭───〔 *ASMAUL HUSNA ${asma.urutan}* 〕───╮
│
│ ${asma.arab}
│
│ *${asma.latin}*
│
│ Arti:
│ ${asma.artiIndonesia}
│
╰────────────────────────────╯
        `.trim()
      }, { quoted: q('fkontak') })
    }

  } else {
    // Menu utama
    const menuText = `
╭───〔 *ASMAUL HUSNA* 〕───╮
│
│ 📖 99 Nama-nama Allah SWT
│
│ 📋 *Cara Penggunaan:*
│
│ • .asmaulhusna
│   → Menu ini
│
│ • .asmaulhusna [nomor]
│   → Lihat nama spesifik
│   → Contoh: .asmaulhusna 1
│
│ • .asmaulhusna all
│   → Lihat semua 99 nama
│
│ 📌 *Nama Populer:*
│ • 1. Ar-Rahman
│ • 2. Ar-Rahiim
│ • 14. Al-Ghaffaar
│ • 17. Ar-Razzaaq
│
╰─────────────────────────╯
    `.trim()

    await conn.sendMessage(m.chat, {
      text: menuText,
      footer: "Asmaul Husna",
      interactiveButtons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "📖 Pilih Nomor",
            sections: [{
              title: "Asmaul Husna Populer",
              rows: [
                { title: "1. Ar-Rahman", description: "Yang Maha Pengasih", id: ".asmaulhusna 1" },
                { title: "2. Ar-Rahiim", description: "Yang Maha Penyayang", id: ".asmaulhusna 2" },
                { title: "14. Al-Ghaffaar", description: "Yang Maha Pengampun", id: ".asmaulhusna 14" },
                { title: "17. Ar-Razzaaq", description: "Yang Maha Pemberi Rezeki", id: ".asmaulhusna 17" },
                { title: "📚 Lihat Semua", description: "Tampilkan 99 nama", id: ".asmaulhusna all" }
              ]
            }]
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['asmaulhusna', 'asmaul', '99nama']
handler.tags = ['islammenu']
handler.command = ["asmaulhusna", "asmaul", "99nama", "asma"]

module.exports = handler
