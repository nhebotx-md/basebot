/**
 * Plugin: stickertrigger.js
 * Description: Triggered effect sticker (shake + red tint)
 * Command: .trigger, .triggered
 */

const { addExif, imageToWebp, videoToWebp, writeExifImg, writeExifVid, writeExif } = require('../Library/exif')
const Jimp = require('jimp')
const { getBuffer } = require('../Library/myfunction')

const handler = async (m, Obj) => {
  const { conn, q, button, quoted, mime } = Obj

  if (!quoted || (!/image/.test(mime) && !/webp/.test(mime))) {
    const helpText = `
╭━━━❰ *TRIGGERED EFFECT* ❱━━━╮
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ Reply gambar/sticker dengan:
┃ .trigger
┃ .triggered
┃
┃ 🎨 *Efek:*
┃ • Triggered overlay
┃ • Red tint
┃ • Shake effect
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("📋 Menu", ".menuplug"),
      ...button.flow.quickReply("🏷️ Sticker WM", ".stickerwm"),
      ...button.flow.quickReply("🎨 Meme Sticker", ".stickermeme")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "Triggered Effect",
      body: "Create triggered sticker"
    })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "⏳ Sedang membuat triggered sticker..."
    }, { quoted: q('fkontak') })

    // Download image
    let media = await quoted.download()
    if (!media) throw new Error('Gagal download gambar')

    // Load triggered overlay (using a simple red tint effect)
    const image = await Jimp.read(media)
    const width = image.getWidth()
    const height = image.getHeight()

    // Resize to square
    const size = Math.min(width, height, 512)
    image.resize(size, size)

    // Apply red tint (triggered effect)
    image.scan(0, 0, size, size, function(x, y, idx) {
      // Increase red channel
      this.bitmap.data[idx] = Math.min(255, this.bitmap.data[idx] + 50)     // Red
      this.bitmap.data[idx + 1] = Math.max(0, this.bitmap.data[idx + 1] - 30) // Green
      this.bitmap.data[idx + 2] = Math.max(0, this.bitmap.data[idx + 2] - 30) // Blue
    })

    // Add "TRIGGERED" text
    try {
      const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)
      const text = "TRIGGERED"
      const textWidth = Jimp.measureText(font, text)
      const x = (size - textWidth) / 2
      const y = size - 50
      
      // Outline
      image.print(font, x - 2, y - 2, text)
      image.print(font, x + 2, y + 2, text)
      image.print(font, x, y, text)
    } catch (e) {
      // Font might not load, continue without text
    }

    // Convert to buffer
    const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG)

    // Create sticker
    const stickerBuffer = await writeExifImg(processedBuffer, {
      packname: global.packname || "TRIGGERED",
      author: global.author || "NHE BOT"
    })

    await conn.sendMessage(m.chat, {
      sticker: stickerBuffer
    }, { quoted: m })

    // Success message
    const buttons = [
      ...button.flow.quickReply("🏷️ Sticker WM", ".stickerwm"),
      ...button.flow.quickReply("🎨 Meme Sticker", ".stickermeme"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(
      `✅ *TRIGGERED* sticker berhasil dibuat!`,
      buttons,
      { title: "Triggered Created", body: "Sticker ready!" }
    )

  } catch (err) {
    console.error("Triggered Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal membuat triggered sticker: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['trigger']
handler.tags = ['sticker']
handler.command = ['trigger', 'triggered', 'trigg']

module.exports = handler
