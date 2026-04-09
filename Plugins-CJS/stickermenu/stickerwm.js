/**
 * Plugin: stickerwm.js
 * Description: Sticker dengan watermark custom
 * Command: .stickerwm, .swm
 */

const { writeExifImg, writeExifVid } = require('../Library/exif')
const fs = require('fs')

const handler = async (m, Obj) => {
  const { conn, q, button, quoted, mime, args, text } = Obj

  // Parse watermark: .swm pack | author
  let packname = global.packname || "NHE BOT"
  let author = global.author || "Created by Bot"

  if (text) {
    const parts = text.split('|').map(p => p.trim())
    if (parts[0]) packname = parts[0]
    if (parts[1]) author = parts[1]
  }

  if (!quoted) {
    const helpText = `
╭━━━❰ *STICKER WATERMARK* ❱━━━╮
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ Reply gambar/video dengan:
┃ .stickerwm Pack | Author
┃
┃ *Contoh:*
┃ .swm MyPack | MyName
┃ .swm (pakai default)
┃
┃ 📷 *Support:*
┃ • Gambar (JPG, PNG)
┃ • Video (MP4, GIF)
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("📋 Menu", ".menuplug"),
      ...button.flow.quickReply("🎨 Sticker Meme", ".stickermeme")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "Sticker Watermark",
      body: "Buat sticker dengan watermark"
    })
  }

  const isImage = /image/.test(mime)
  const isVideo = /video/.test(mime)
  const isSticker = /webp/.test(mime)

  if (!isImage && !isVideo && !isSticker) {
    return conn.sendMessage(m.chat, {
      text: "❌ Reply gambar/video/sticker untuk membuat sticker!"
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "⏳ Sedang membuat sticker..."
    }, { quoted: q('fkontak') })

    let media = await quoted.download()
    if (!media) throw new Error('Gagal download media')

    let stickerBuffer

    if (isImage || isSticker) {
      stickerBuffer = await writeExifImg(media, { packname, author })
    } else if (isVideo) {
      stickerBuffer = await writeExifVid(media, { packname, author })
    }

    if (!stickerBuffer) throw new Error('Gagal membuat sticker')

    await conn.sendMessage(m.chat, {
      sticker: stickerBuffer
    }, { quoted: m })

    // Send success message with buttons
    const buttons = [
      ...button.flow.quickReply("🎨 Sticker Meme", ".stickermeme"),
      ...button.flow.quickReply("⚡ Triggered", ".trigger"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(`✅ Sticker berhasil dibuat!\n\n🏷️ Pack: ${packname}\n👤 Author: ${author}`, buttons, {
      title: "Sticker Created",
      body: "Watermark applied"
    })

  } catch (err) {
    console.error("StickerWM Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal membuat sticker: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['stickerwm']
handler.tags = ['sticker']
handler.command = ['stickerwm', 'swm', 'stickwm']

module.exports = handler
