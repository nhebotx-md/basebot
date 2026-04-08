/**
 * Sticker Watermark Plugin
 * Category: stickermenu
 * Feature: Membuat sticker dengan watermark custom
 */

const { writeExif } = require('@itsukichan/baileys')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const util = require('util')
const execPromise = util.promisify(exec)

const handler = async (m, Obj) => {
  const { conn, q, args, quoted, mime, reply } = Obj
  
  const packname = args.join(' ') || global.packname || 'NHE Bot'
  const author = global.author || 'WhatsApp Bot'

  // Cek apakah ada quoted media
  if (!quoted) {
    return conn.sendMessage(m.chat, {
      text: "❌ Reply gambar/video yang mau dijadikan sticker!",
      footer: "Sticker Maker",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Cara Pakai",
            id: ".stickerwm help"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }

  const mimetype = quoted.mimetype || ''
  
  if (!/image|video/.test(mimetype)) {
    return conn.sendMessage(m.chat, {
      text: "❌ Media tidak valid! Reply gambar atau video."
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "⏳ Sedang membuat sticker dengan watermark..."
    }, { quoted: q('fkontak') })

    // Download media
    const buffer = await quoted.download()
    const tempDir = path.join(__dirname, '../temp')
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const inputPath = path.join(tempDir, `input_${Date.now()}.webp`)
    const outputPath = path.join(tempDir, `output_${Date.now()}.webp`)

    // Simpan buffer sementara
    fs.writeFileSync(inputPath, buffer)

    let stickerBuffer

    if (/image/.test(mimetype)) {
      // Proses gambar jadi sticker
      await execPromise(`ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -lossless 1 -loop 0 "${outputPath}"`)
      stickerBuffer = fs.readFileSync(outputPath)
    } else if (/video/.test(mimetype)) {
      // Proses video jadi animated sticker
      await execPromise(`ffmpeg -i "${inputPath}" -vf "fps=30,scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" -loop 0 "${outputPath}"`)
      stickerBuffer = fs.readFileSync(outputPath)
    }

    // Tambahkan metadata EXIF
    const exifBuffer = await writeExif({ 
      mimetype: 'image/webp',
      data: stickerBuffer 
    }, { 
      packId: 'nhe.bot.sticker',
      packName: packname,
      packPublish: author,
      packEmail: '',
      packWebsite: '',
      androidApp: '',
      iOSApp: '',
      categories: ['😄', '😀'],
      emojis: ['🤖'],
      isAvatar: 0
    })

    // Kirim sticker
    await conn.sendMessage(m.chat, {
      sticker: exifBuffer
    }, { quoted: m })

    // Bersihkan file temp
    try {
      fs.unlinkSync(inputPath)
      fs.unlinkSync(outputPath)
    } catch {}

  } catch (err) {
    console.error("StickerWM Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal membuat sticker!\n\nError: " + err.message,
      footer: "Sticker Maker"
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['stickerwm', 'swm', 'stickertag']
handler.tags = ['stickermenu']
handler.command = ["stickerwm", "swm", "stickertag"]

module.exports = handler
