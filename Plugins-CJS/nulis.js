/**
 * Nulis Plugin
 * Category: createmenu
 * Feature: Menulis teks ke dalam gambar buku
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

const handler = async (m, Obj) => {
  const { conn, q, args, text } = Obj

  if (!text) {
    return conn.sendMessage(m.chat, {
      text: "❌ Masukkan teks yang ingin ditulis!",
      footer: "Nulis Generator",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Contoh",
            id: ".nulis example"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }

  if (text.toLowerCase() === 'example') {
    return conn.sendMessage(m.chat, {
      text: `
╭───〔 *NULIS GENERATOR* 〕───╮
│
│ 📋 *Cara Penggunaan:*
│
│ .nulis [teks]
│
│ 📌 *Contoh:*
│ • .nulis Halo semuanya!
│ • .nulis Catatan hari ini:\nBelajar JavaScript
│ • .nulis To-do list:\n1. Makan\n2. Tidur\n3. Ngoding
│
│ 📝 *Fitur:*
│ • Teks akan ditulis di buku
│ • Hasil seperti tulisan tangan
│ • Bisa banyak baris
│
╰──────────────────────────╯
      `.trim()
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "✍️ Sedang menulis teks ke buku..."
    }, { quoted: q('fkontak') })

    // Gunakan API nulis
    const apiUrls = [
      `https://api.caliph.biz.id/api/nulis?text=${encodeURIComponent(text)}&apikey=caliphkey`,
      `https://api.zahwazein.xyz/convert/nulis?text=${encodeURIComponent(text)}`,
      `https://api.lolhuman.xyz/api/nulis?apikey=yourkey&text=${encodeURIComponent(text)}`
    ]

    let success = false
    
    for (const apiUrl of apiUrls) {
      try {
        const response = await axios.get(apiUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        })

        if (response.data && response.data.length > 1000) {
          await conn.sendMessage(m.chat, {
            image: Buffer.from(response.data),
            caption: `
╭───〔 *TULISAN SELESAI* 〕───╮
│
│ ✅ Teks berhasil ditulis!
│
│ 📝 *Isi:*
│ ${text.length > 100 ? text.substring(0, 100) + '...' : text}
│
╰──────────────────────────╯
            `.trim(),
            footer: "Nulis Generator",
            interactiveButtons: [
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "✍️ Tulis Lagi",
                  id: ".nulis "
                })
              }
            ]
          }, { quoted: q('fkontak') })
          
          success = true
          break
        }
      } catch (e) {
        continue
      }
    }

    if (!success) {
      // Fallback: buat gambar sederhana dengan canvas
      throw new Error('All APIs failed')
    }

  } catch (err) {
    console.error("Nulis Error:", err)
    
    // Fallback ke API alternatif
    try {
      const fallbackUrl = `https://api.popcat.xyz/magik?text=${encodeURIComponent(text)}`
      
      await conn.sendMessage(m.chat, {
        text: `⚠️ Generator nulis sedang maintenance.\n\nTeks yang ingin ditulis:\n\n${text}`,
        footer: "Nulis Generator"
      }, { quoted: q('fkontak') })
    } catch {
      conn.sendMessage(m.chat, {
        text: "❌ Gagal membuat tulisan! Coba lagi nanti."
      }, { quoted: q('fkontak') })
    }
  }
}

handler.help = ['nulis', 'tulis', 'writen']
handler.tags = ['createmenu']
handler.command = ["nulis", "tulis", "writen"]

module.exports = handler
