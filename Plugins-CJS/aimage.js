/**
 * AI Image Generator Plugin
 * Category: aimenu
 * Feature: Generate gambar dari teks menggunakan AI
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

const handler = async (m, Obj) => {
  const { conn, q, args, text } = Obj

  if (!text) {
    return conn.sendMessage(m.chat, {
      text: "❌ Masukkan deskripsi gambar yang ingin dibuat!",
      footer: "AI Image Generator",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Contoh",
            id: ".aimage example"
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🎨 Gaya Anime",
            id: ".aimage anime girl with blue hair, beautiful scenery"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }

  if (text.toLowerCase() === 'example') {
    return conn.sendMessage(m.chat, {
      text: `
╭───〔 *AI IMAGE GENERATOR* 〕───╮
│
│ 🎨 Generate gambar dari teks
│
│ 📋 *Cara Penggunaan:*
│
│ .aimage [deskripsi]
│
│ 📌 *Contoh:*
│ • .aimage a beautiful sunset over mountains
│ • .aimage cute cat wearing glasses, digital art
│ • .aimage futuristic city, cyberpunk style
│ • .aimage anime girl with blue hair
│
│ 🎨 *Tips:*
│ • Deskripsikan dengan detail
│ • Sebutkan gaya (anime, realistic, digital art)
│ • Tambahkan mood/atmosphere
│
│ ⏱️ *Estimasi:* 10-30 detik
│
╰─────────────────────────────╯
      `.trim()
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: `🎨 Sedang membuat gambar...\n\n📋 *Prompt:* ${text}\n\n⏱️ Estimasi: 10-30 detik`
    }, { quoted: q('fkontak') })

    // API endpoints untuk image generation
    const imageApis = [
      {
        name: 'Pollinations',
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?width=1024&height=1024&nologo=true&seed=${Date.now()}`,
        method: 'GET',
        responseType: 'arraybuffer'
      },
      {
        name: 'Airforce',
        url: `https://api.airforce/v1/imagine?prompt=${encodeURIComponent(text)}&size=1024x1024`,
        method: 'GET',
        responseType: 'arraybuffer'
      }
    ]

    let imageBuffer = null
    let usedApi = ''

    for (const api of imageApis) {
      try {
        const response = await axios({
          method: api.method,
          url: api.url,
          responseType: api.responseType,
          timeout: 120000
        })

        if (response.data && response.data.length > 1000) {
          imageBuffer = Buffer.from(response.data)
          usedApi = api.name
          break
        }
      } catch (apiErr) {
        console.error(`${api.name} Error:`, apiErr.message)
        continue
      }
    }

    if (!imageBuffer) {
      // Fallback: gunakan URL langsung
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?width=1024&height=1024&nologo=true`
      
      await conn.sendMessage(m.chat, {
        image: { url: fallbackUrl },
        caption: `
╭───〔 *AI IMAGE* 〕───╮
│
│ ✅ Gambar berhasil dibuat!
│
│ 📝 *Prompt:*
│ ${text}
│
│ ⚡ Powered by Pollinations AI
╰────────────────────╯
        `.trim(),
        footer: "AI Image Generator",
        interactiveButtons: [
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🎨 Buat Lagi",
              id: ".aimage "
            })
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🔄 Variasi",
              id: `.aimage ${text} (variation)`
            })
          }
        ]
      }, { quoted: q('fkontak') })
      
      return
    }

    // Simpan dan kirim gambar
    const tempDir = path.join(__dirname, '../temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const imagePath = path.join(tempDir, `ai_image_${Date.now()}.png`)
    fs.writeFileSync(imagePath, imageBuffer)

    await conn.sendMessage(m.chat, {
      image: { url: imagePath },
      caption: `
╭───〔 *AI IMAGE* 〕───╮
│
│ ✅ Gambar berhasil dibuat!
│
│ 📝 *Prompt:*
│ ${text}
│
│ ⚡ Powered by ${usedApi}
╰────────────────────╯
      `.trim(),
      footer: "AI Image Generator",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🎨 Buat Lagi",
            id: ".aimage "
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🔄 Variasi",
            id: `.aimage ${text} (variation)`
          })
        }
      ]
    }, { quoted: q('fkontak') })

    // Cleanup
    try {
      fs.unlinkSync(imagePath)
    } catch {}

  } catch (err) {
    console.error("AI Image Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal membuat gambar!\n\nCoba dengan prompt yang lebih sederhana atau tunggu beberapa saat.",
      footer: "AI Image Generator"
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['aimage', 'aiimage', 'generateimage', 'imagine']
handler.tags = ['aimenu']
handler.command = ["aimage", "aiimage", "generateimage", "imagine", "dalle", "diffusion"]
handler.limit = true

module.exports = handler
