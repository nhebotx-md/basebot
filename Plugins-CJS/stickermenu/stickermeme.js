/**
 * Plugin: stickermeme.js
 * Description: Meme sticker generator dengan text atas & bawah
 * Command: .stickermeme, .smeme
 */

const { writeExifImg } = require('../Library/exif')
const Jimp = require('jimp')

const handler = async (m, Obj) => {
  const { conn, q, button, quoted, mime, text, args } = Obj

  if (!quoted || !/image/.test(mime)) {
    const helpText = `
╭━━━❰ *MEME STICKER* ❱━━━╮
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ Reply gambar dengan:
┃ .stickermeme Teks Atas | Teks Bawah
┃
┃ *Contoh:*
┃ .smeme Hello | World
┃ .smeme When you | See this
┃
┃ 🎨 *Fitur:*
┃ • Text atas & bawah
┃ • Font impact style
┃ • Auto resize
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("📋 Menu", ".menuplug"),
      ...button.flow.quickReply("🏷️ Sticker WM", ".stickerwm")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "Meme Sticker",
      body: "Generator meme sticker"
    })
  }

  if (!text) {
    return conn.sendMessage(m.chat, {
      text: "❌ Masukkan teks meme!\nContoh: .smeme Teks Atas | Teks Bawah"
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "⏳ Sedang membuat meme sticker..."
    }, { quoted: q('fkontak') })

    // Parse text
    const parts = text.split('|').map(p => p.trim())
    const topText = parts[0] || ''
    const bottomText = parts[1] || ''

    // Download image
    let media = await quoted.download()
    if (!media) throw new Error('Gagal download gambar')

    // Process image with Jimp
    const image = await Jimp.read(media)
    const width = image.getWidth()
    const height = image.getHeight()

    // Add top text
    if (topText) {
      const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)
      const textWidth = Jimp.measureText(font, topText)
      const x = (width - textWidth) / 2
      
      // Add black outline
      image.print(font, x - 2, 18, topText)
      image.print(font, x + 2, 22, topText)
      image.print(font, x, 20, topText)
    }

    // Add bottom text
    if (bottomText) {
      const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)
      const textWidth = Jimp.measureText(font, bottomText)
      const x = (width - textWidth) / 2
      const y = height - 50
      
      image.print(font, x - 2, y - 2, bottomText)
      image.print(font, x + 2, y + 2, bottomText)
      image.print(font, x, y, bottomText)
    }

    // Convert to buffer
    const processedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG)

    // Create sticker
    const stickerBuffer = await writeExifImg(processedBuffer, {
      packname: global.packname || "NHE MEME",
      author: global.author || "Meme Generator"
    })

    await conn.sendMessage(m.chat, {
      sticker: stickerBuffer
    }, { quoted: m })

    // Success message
    const buttons = [
      ...button.flow.quickReply("🏷️ Sticker WM", ".stickerwm"),
      ...button.flow.quickReply("⚡ Triggered", ".trigger"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(
      `✅ Meme sticker berhasil dibuat!\n\n🔝 Atas: ${topText || '-'}\n🔽 Bawah: ${bottomText || '-'}`,
      buttons,
      { title: "Meme Created", body: "Sticker ready!" }
    )

  } catch (err) {
    console.error("Meme Sticker Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal membuat meme sticker: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['stickermeme']
handler.tags = ['sticker']
handler.command = ['stickermeme', 'smeme', 'memestick']

module.exports = handler
