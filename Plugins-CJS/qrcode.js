/**
 * QR Code Generator Plugin
 * Category: createmenu
 * Feature: Membuat QR Code dari teks atau URL
 */

const axios = require('axios')
const QRCode = require('qrcode')
const fs = require('fs')
const path = require('path')

const handler = async (m, Obj) => {
  const { conn, q, args, text } = Obj

  if (!text) {
    return conn.sendMessage(m.chat, {
      text: "❌ Masukkan teks atau URL yang ingin dijadikan QR Code!",
      footer: "QR Code Generator",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Contoh",
            id: ".qrcode example"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }

  if (text.toLowerCase() === 'example') {
    return conn.sendMessage(m.chat, {
      text: `
╭───〔 *QR CODE GENERATOR* 〕───╮
│
│ 📋 *Cara Penggunaan:*
│
│ .qrcode [teks/url]
│
│ 📌 *Contoh:*
│ • .qrcode https://google.com
│ • .qrcode Hello World
│ • .qrcode WA.ME/628xxxxxxxx
│ • .qrcode Nomor rekening: 1234567890
│
│ 📱 *Gunakan:*
│ • Scan dengan kamera HP
│ • Share kontak/info
│ • Simpan data penting
│
╰────────────────────────────╯
      `.trim()
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "⏳ Sedang membuat QR Code..."
    }, { quoted: q('fkontak') })

    const tempDir = path.join(__dirname, '../temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const qrPath = path.join(tempDir, `qrcode_${Date.now()}.png`)

    // Generate QR Code
    await QRCode.toFile(qrPath, text, {
      type: 'png',
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Baca file dan kirim
    const qrBuffer = fs.readFileSync(qrPath)

    await conn.sendMessage(m.chat, {
      image: qrBuffer,
      caption: `
╭───〔 *QR CODE BERHASIL* 〕───╮
│
│ ✅ QR Code berhasil dibuat!
│
│ 📝 *Konten:*
│ ${text.length > 50 ? text.substring(0, 50) + '...' : text}
│
│ 📱 *Scan untuk melihat*
│
╰────────────────────────────╯
      `.trim(),
      footer: "QR Code Generator",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🔄 Buat Lagi",
            id: ".qrcode "
          })
        }
      ]
    }, { quoted: q('fkontak') })

    // Bersihkan file temp
    try {
      fs.unlinkSync(qrPath)
    } catch {}

  } catch (err) {
    console.error("QRCode Error:", err)
    
    // Fallback: gunakan API eksternal
    try {
      const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(text)}`
      
      await conn.sendMessage(m.chat, {
        image: { url: apiUrl },
        caption: `
╭───〔 *QR CODE BERHASIL* 〕───╮
│
│ ✅ QR Code berhasil dibuat!
│
│ 📝 *Konten:*
│ ${text.length > 50 ? text.substring(0, 50) + '...' : text}
│
╰────────────────────────────╯
        `.trim()
      }, { quoted: q('fkontak') })
    } catch (apiErr) {
      conn.sendMessage(m.chat, {
        text: "❌ Gagal membuat QR Code!\n\nPastikan qrcode package terinstall: npm install qrcode"
      }, { quoted: q('fkontak') })
    }
  }
}

handler.help = ['qrcode', 'qr', 'createqr']
handler.tags = ['createmenu']
handler.command = ["qrcode", "qr", "createqr", "buatqr"]

module.exports = handler
