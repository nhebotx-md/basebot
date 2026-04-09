/**
 * Plugin: quoteit.js
 * Description: Quote maker aesthetic
 * Command: .quote, .quoteit
 */

const { getBuffer } = require('../Library/myfunction')
const axios = require('axios')

const handler = async (m, Obj) => {
  const { conn, q, button, text, quoted, pushname } = Obj

  // Parse input: .quote Teks | Nama | Avatar
  let quoteText = text
  let name = pushname || "Anonymous"
  let avatar = "https://files.catbox.moe/5x2b8n.jpg"

  if (text && text.includes('|')) {
    const parts = text.split('|').map(p => p.trim())
    quoteText = parts[0]
    if (parts[1]) name = parts[1]
    if (parts[2]) avatar = parts[2]
  }

  // If replying to a message, use that message as quote
  if (quoted && !text) {
    quoteText = quoted.text || quoted.caption || "No text"
    name = quoted.pushName || quoted.sender?.split('@')[0] || "Anonymous"
  }

  if (!quoteText) {
    const helpText = `
╭━━━❰ *QUOTE MAKER* ❱━━━╮
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ 1. Reply pesan dengan .quote
┃ 2. .quote Teks | Nama | AvatarURL
┃
┃ *Contoh:*
┃ .quote Life is beautiful | John
┃ .quote Hello World | Me
┃
┃ (Reply pesan untuk quote otomatis)
┃
┃ 🎨 *Fitur:*
┃ • Quote aesthetic
┃ • Custom nama & avatar
┃ • Background cantik
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🔲 QR Code", ".qrcode"),
      ...button.flow.quickReply("📝 Nulis", ".nulis"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "Quote Maker",
      body: "Buat quote aesthetic"
    })
  }

  if (quoteText.length > 300) {
    return conn.sendMessage(m.chat, {
      text: "❌ Teks terlalu panjang! Maksimal 300 karakter."
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "🎨 Sedang membuat quote..."
    }, { quoted: q('fkontak') })

    // API quote
    const apiUrl = `https://api.deline.web.id/tools/quote?text=${encodeURIComponent(quoteText)}&name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`
    
    let imageBuffer
    try {
      imageBuffer = await getBuffer(apiUrl)
    } catch (e) {
      // Fallback API
      const fallbackUrl = `https://api.lolhuman.xyz/api/quote?apikey=&text=${encodeURIComponent(quoteText)}&name=${encodeURIComponent(name)}`
      imageBuffer = await getBuffer(fallbackUrl)
    }

    await conn.sendMessage(m.chat, {
      image: imageBuffer,
      caption: `
✅ *Quote berhasil dibuat!*

💬 "${quoteText.length > 100 ? quoteText.substring(0, 100) + '...' : quoteText}"

— *${name}*`
    }, { quoted: m })

    // Success buttons
    const buttons = [
      ...button.flow.quickReply("🔲 QR Code", ".qrcode"),
      ...button.flow.quickReply("📝 Nulis", ".nulis"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive("✅ Quote aesthetic siap!", buttons, {
      title: "Quote Created",
      body: `By ${name}`
    })

  } catch (err) {
    console.error("Quote Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal membuat quote: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['quote']
handler.tags = ['create']
handler.command = ['quote', 'quoteit', 'quotemaker']
handler.limit = true

module.exports = handler
