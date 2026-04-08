/**
 * Quote Maker Plugin
 * Category: createmenu
 * Feature: Membuat gambar quote dengan teks custom
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { createCanvas, loadImage, registerFont } = require('canvas')

const handler = async (m, Obj) => {
  const { conn, q, args, text, quoted, pushname } = Obj

  if (!text) {
    return conn.sendMessage(m.chat, {
      text: "❌ Masukkan teks quote!",
      footer: "Quote Maker",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Contoh",
            id: ".quote example"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }

  if (text.toLowerCase() === 'example') {
    return conn.sendMessage(m.chat, {
      text: `
╭───〔 *QUOTE MAKER* 〕───╮
│
│ 📋 *Cara Penggunaan:*
│
│ .quote [teks] | [author]
│
│ 📌 *Contoh:*
│ • .quote Jangan menyerah | Albert Einstein
│ • .quote Tetap semangat | User
│ • .quote Hidup ini indah
│
│ 🖼️ *Fitur:*
│ • Buat quote aesthetic
│ • Custom author name
│ • Background random
│
╰─────────────────────────╯
      `.trim()
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "⏳ Sedang membuat quote..."
    }, { quoted: q('fkontak') })

    // Parse teks dan author
    const parts = text.split('|').map(p => p.trim())
    const quoteText = parts[0]
    const author = parts[1] || pushname || 'Anonymous'

    // Dapatkan foto profil user
    let avatarUrl
    try {
      avatarUrl = await conn.profilePictureUrl(m.sender, 'image')
    } catch {
      avatarUrl = 'https://files.catbox.moe/5x2b8n.jpg'
    }

    // Gunakan API quote
    const apiUrls = [
      `https://api.quotable.io/random`,
      `https://zenquotes.io/api/random`
    ]

    // Coba buat dengan canvas
    try {
      const tempDir = path.join(__dirname, '../temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      const quotePath = path.join(tempDir, `quote_${Date.now()}.png`)

      // Buat canvas
      const width = 800
      const height = 600
      const canvas = createCanvas(width, height)
      const ctx = canvas.getContext('2d')

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, '#1a1a2e')
      gradient.addColorStop(0.5, '#16213e')
      gradient.addColorStop(1, '#0f3460')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Decorative elements
      ctx.strokeStyle = '#e94560'
      ctx.lineWidth = 4
      ctx.strokeRect(30, 30, width - 60, height - 60)

      // Quote marks
      ctx.fillStyle = '#e94560'
      ctx.font = 'bold 80px Arial'
      ctx.fillText('"', 60, 120)

      // Quote text
      ctx.fillStyle = '#ffffff'
      ctx.font = '30px Arial'
      ctx.textAlign = 'center'
      
      // Wrap text
      const maxWidth = width - 120
      const lineHeight = 40
      const words = quoteText.split(' ')
      let line = ''
      let y = 200

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' '
        const metrics = ctx.measureText(testLine)
        
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, width / 2, y)
          line = words[i] + ' '
          y += lineHeight
        } else {
          line = testLine
        }
      }
      ctx.fillText(line, width / 2, y)

      // Author
      ctx.fillStyle = '#e94560'
      ctx.font = 'italic 24px Arial'
      ctx.fillText(`— ${author}`, width / 2, y + 80)

      // Save
      const buffer = canvas.toBuffer('image/png')
      fs.writeFileSync(quotePath, buffer)

      // Kirim
      await conn.sendMessage(m.chat, {
        image: { url: quotePath },
        caption: `
╭───〔 *QUOTE BERHASIL* 〕───╮
│
│ ✅ Quote berhasil dibuat!
│
│ 📝 *Quote:*
│ "${quoteText}"
│
│ ✍️ *Author:* ${author}
│
╰─────────────────────────╯
        `.trim(),
        footer: "Quote Maker",
        interactiveButtons: [
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🔄 Buat Lagi",
              id: ".quote "
            })
          }
        ]
      }, { quoted: q('fkontak') })

      // Cleanup
      try {
        fs.unlinkSync(quotePath)
      } catch {}

    } catch (canvasErr) {
      console.error("Canvas Error:", canvasErr)
      
      // Fallback: gunakan API eksternal
      const quoteApiUrl = `https://api.quotable.io/random`
      const response = await axios.get(quoteApiUrl, { timeout: 10000 })
      
      if (response.data) {
        await conn.sendMessage(m.chat, {
          text: `
╭───〔 *QUOTE OF THE DAY* 〕───╮
│
│ "${response.data.content}"
│
│ ✍️ ${response.data.author}
│
│ 📝 Quote yang kamu minta:
│ "${quoteText}"
│ — ${author}
│
╰────────────────────────────╯
          `.trim()
        }, { quoted: q('fkontak') })
      }
    }

  } catch (err) {
    console.error("Quote Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal membuat quote!\n\nPastikan canvas package terinstall: npm install canvas"
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['quote', 'quoteit', 'buatquote']
handler.tags = ['createmenu']
handler.command = ["quote", "quoteit", "buatquote", "quotes"]

module.exports = handler
