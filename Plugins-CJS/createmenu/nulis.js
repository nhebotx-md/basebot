/**
 * Plugin: nulis.js
 * Description: Nulis ke gambar buku
 * Command: .nulis, .tulis
 */

const { getBuffer } = require('../Library/myfunction')
const axios = require('axios')

const handler = async (m, Obj) => {
  const { conn, q, button, text } = Obj

  if (!text) {
    const helpText = `
╭━━━❰ *NULIS GAMBAR* ❱━━━╮
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .nulis Teks yang mau ditulis
┃ .tulis Teks yang mau ditulis
┃
┃ *Contoh:*
┃ .nulis Halo semuanya!
┃ .tulis Ini tulisan di buku
┃
┃ 📖 *Fitur:*
┃ • Tulis teks ke gambar buku
┃ • Style tulisan tangan
┃ • Bisa panjang
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🔲 QR Code", ".qrcode"),
      ...button.flow.quickReply("💬 Quote", ".quote"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "Nulis Gambar",
      body: "Tulis teks ke gambar buku"
    })
  }

  if (text.length > 500) {
    return conn.sendMessage(m.chat, {
      text: "❌ Teks terlalu panjang! Maksimal 500 karakter."
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "✍️ Sedang menulis..."
    }, { quoted: q('fkontak') })

    // API nulis
    const apiUrls = [
      `https://api.deline.web.id/tools/nulis?text=${encodeURIComponent(text)}`,
      `https://api.lolhuman.xyz/api/nulis?apikey=&text=${encodeURIComponent(text)}`
    ]

    let imageUrl = null

    for (const apiUrl of apiUrls) {
      try {
        const response = await axios.get(apiUrl, { timeout: 10000 })
        if (response.data?.result || response.data?.image) {
          imageUrl = response.data.result || response.data.image
          break
        }
      } catch (e) {
        continue
      }
    }

    if (!imageUrl) {
      // Fallback: use alternative API
      imageUrl = `https://api.vreden.web.id/api/maker/nulis?text=${encodeURIComponent(text)}`
    }

    const imageBuffer = await getBuffer(imageUrl)

    await conn.sendMessage(m.chat, {
      image: imageBuffer,
      caption: `
✅ *Tulisan selesai!*

📝 *Teks:* ${text.length > 100 ? text.substring(0, 100) + '...' : text}

_Terlihat seperti tulisan tangan asli!_`
    }, { quoted: m })

    // Success buttons
    const buttons = [
      ...button.flow.quickReply("🔲 QR Code", ".qrcode"),
      ...button.flow.quickReply("💬 Quote", ".quote"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive("✅ Tulisan siap!", buttons, {
      title: "Nulis Complete",
      body: "Gambar buku dengan tulisan"
    })

  } catch (err) {
    console.error("Nulis Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal menulis: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['nulis']
handler.tags = ['create']
handler.command = ['nulis', 'tulis', 'nuliskanan', 'nuliskiri']
handler.limit = true

module.exports = handler
