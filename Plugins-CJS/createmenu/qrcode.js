/**
 * Plugin: qrcode.js
 * Description: Generate QR Code
 * Command: .qrcode, .qr
 */

const { getBuffer } = require('../Library/myfunction')
const QRCode = require('qrcode')

const handler = async (m, Obj) => {
  const { conn, q, button, text } = Obj

  if (!text) {
    const helpText = `
╭━━━❰ *QR CODE GENERATOR* ❱━━━╮
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .qrcode Teks/URL
┃ .qr Teks/URL
┃
┃ *Contoh:*
┃ .qr https://google.com
┃ .qr Hello World
┃ .qr +6281234567890
┃
┃ 📱 *Fitur:*
┃ • Generate QR Code
┃ • Support URL, teks, nomor
┃ • High quality
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("📝 Nulis", ".nulis"),
      ...button.flow.quickReply("💬 Quote", ".quote"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "QR Code Generator",
      body: "Buat QR Code"
    })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "⏳ Sedang membuat QR Code..."
    }, { quoted: q('fkontak') })

    // Generate QR Code
    const qrBuffer = await QRCode.toBuffer(text, {
      type: 'png',
      width: 500,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Send QR Code
    await conn.sendMessage(m.chat, {
      image: qrBuffer,
      caption: `
✅ *QR Code berhasil dibuat!*

📝 *Konten:* ${text.length > 50 ? text.substring(0, 50) + '...' : text}
📐 *Size:* 500x500px

_Scan dengan aplikasi QR Scanner_`
    }, { quoted: m })

    // Success buttons
    const buttons = [
      ...button.flow.quickReply("📝 Nulis", ".nulis"),
      ...button.flow.quickReply("💬 Quote", ".quote"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive("✅ QR Code siap digunakan!", buttons, {
      title: "QR Code Created",
      body: "Scan sekarang!"
    })

  } catch (err) {
    console.error("QR Code Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal membuat QR Code: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['qrcode']
handler.tags = ['create']
handler.command = ['qrcode', 'qr', 'qrcode']

module.exports = handler
