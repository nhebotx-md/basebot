/**
 * Plugin: aimage.js
 * Description: Generate gambar AI
 * Command: .aimage, .imagine
 */

const { getBuffer } = require('../Library/myfunction')
const axios = require('axios')

const handler = async (m, Obj) => {
  const { conn, q, button, text } = Obj

  if (!text) {
    const helpText = `
╭━━━❰ *AI IMAGE GENERATOR* ❱━━━╮
┃
┃ 🎨 Generate gambar dengan AI
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .aimage Deskripsi gambar
┃ .imagine Deskripsi gambar
┃
┃ *Contoh:*
┃ .aimage cat in space
┃ .imagine beautiful sunset
┃ .aimage cyberpunk city
┃
┃ 💡 *Tips:*
┃ • Deskripsi detail = hasil bagus
┃ • Gunakan bahasa Inggris
┃ • Maksimal 500 karakter
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🐱 Cat Space", ".aimage cute cat astronaut in space"),
      ...button.flow.quickReply("🌅 Sunset", ".aimage beautiful sunset at beach"),
      ...button.flow.quickReply("🤖 AI Chat", ".ai"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "AI Image Generator",
      body: "Buat gambar dengan AI"
    })
  }

  if (text.length > 500) {
    return conn.sendMessage(m.chat, {
      text: "❌ Deskripsi terlalu panjang! Maksimal 500 karakter."
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "🎨 AI sedang menggambar...\n⏳ Estimasi: 10-30 detik"
    }, { quoted: q('fkontak') })

    let imageUrl = null

    // API 1: Pollinations AI
    try {
      const encodedPrompt = encodeURIComponent(text)
      imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`
      
      // Test if URL is accessible
      const testResponse = await axios.head(imageUrl, { timeout: 5000 })
      if (testResponse.status === 200) {
        // URL is valid
      }
    } catch (e) {
      console.log('Pollinations API failed:', e.message)
      imageUrl = null
    }

    // API 2: Alternative
    if (!imageUrl) {
      try {
        const apiUrl = `https://api.vreden.web.id/api/midjourney?text=${encodeURIComponent(text)}`
        const response = await axios.get(apiUrl, { timeout: 30000 })
        if (response.data && response.data.url) {
          imageUrl = response.data.url
        }
      } catch (e) {
        console.log('Midjourney API failed:', e.message)
      }
    }

    // API 3: Another fallback
    if (!imageUrl) {
      try {
        const apiUrl = `https://api.lolhuman.xyz/api/dall-e?apikey=&prompt=${encodeURIComponent(text)}`
        const response = await axios.get(apiUrl, { timeout: 30000 })
        if (response.data && response.data.result) {
          imageUrl = response.data.result
        }
      } catch (e) {
        console.log('DALL-E API failed:', e.message)
      }
    }

    if (!imageUrl) {
      throw new Error('Semua AI image API tidak merespons')
    }

    // Download and send image
    const imageBuffer = await getBuffer(imageUrl)

    await conn.sendMessage(m.chat, {
      image: imageBuffer,
      caption: `
✅ *Gambar berhasil dibuat!*

📝 *Prompt:* ${text}

🎨 *Powered by AI*

_Simpan gambar jika suka!_`
    }, { quoted: m })

    // Success buttons
    const buttons = [
      ...button.flow.quickReply("🔄 Variasi", `.aimage ${text}`),
      ...button.flow.quickReply("🤖 AI Chat", ".ai"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive("✅ Gambar AI siap!", buttons, {
      title: "AI Image Created",
      body: "Image generated successfully"
    })

  } catch (err) {
    console.error("AI Image Error:", err)
    
    const buttons = [
      ...button.flow.quickReply("🔄 Coba Lagi", `.aimage ${text}`),
      ...button.flow.quickReply("🤖 AI Chat", ".ai"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(
      `❌ Gagal generate gambar.\n\nError: ${err.message}\n\nTips:\n• Coba deskripsi lebih singkat\n• Gunakan bahasa Inggris\n• Coba lagi nanti`,
      buttons,
      { title: "AI Image Error", body: "Please try again" }
    )
  }
}

handler.help = ['aimage']
handler.tags = ['ai']
handler.command = ['aimage', 'imagine', 'aiimage', 'dalle']
handler.limit = true

module.exports = handler
