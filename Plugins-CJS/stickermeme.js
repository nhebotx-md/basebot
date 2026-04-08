/**
 * Sticker Meme Plugin
 * Category: stickermenu
 * Feature: Membuat sticker meme dengan teks atas dan bawah
 */

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const util = require('util')
const execPromise = util.promisify(exec)

const handler = async (m, Obj) => {
  const { conn, q, args, quoted, text } = Obj

  if (!quoted) {
    return conn.sendMessage(m.chat, {
      text: "❌ Reply gambar yang mau dijadikan meme sticker!",
      footer: "Meme Sticker Maker",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Cara Pakai",
            id: ".smeme help"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }

  const mimetype = quoted.mimetype || ''
  
  if (!/image/.test(mimetype)) {
    return conn.sendMessage(m.chat, {
      text: "❌ Hanya gambar yang bisa dijadikan meme sticker!"
    }, { quoted: q('fkontak') })
  }

  // Parse teks atas dan bawah
  // Format: .smeme teks atas | teks bawah
  const textParts = text ? text.split('|').map(t => t.trim()) : ['', '']
  const topText = textParts[0] || 'TOP TEXT'
  const bottomText = textParts[1] || 'BOTTOM TEXT'

  try {
    await conn.sendMessage(m.chat, {
      text: "⏳ Sedang membuat meme sticker..."
    }, { quoted: q('fkontak') })

    // Download media
    const buffer = await quoted.download()
    const tempDir = path.join(__dirname, '../temp')
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const inputPath = path.join(tempDir, `meme_input_${Date.now()}.png`)
    const outputPath = path.join(tempDir, `meme_output_${Date.now()}.webp`)

    // Simpan buffer sementara
    fs.writeFileSync(inputPath, buffer)

    // Escape karakter khusus untuk ImageMagick
    const escapeText = (str) => str.replace(/'/g, "'\\''").replace(/"/g, '\\"')
    
    // Proses gambar dengan teks meme menggunakan ImageMagick
    const topEscaped = escapeText(topText.toUpperCase())
    const bottomEscaped = escapeText(bottomText.toUpperCase())

    // Meme style dengan outline teks
    const memeCommand = `convert "${inputPath}" \
      -resize 512x512> \
      -gravity North \
      -stroke black -strokewidth 4 \
      -fill white -pointsize 40 \
      -font Impact \
      -annotate +0+20 "${topEscaped}" \
      -stroke black -strokewidth 4 \
      -fill white -pointsize 40 \
      -font Impact \
      -gravity South \
      -annotate +0+20 "${bottomEscaped}" \
      "${outputPath}"`

    await execPromise(memeCommand)

    // Convert ke webp untuk sticker
    const webpPath = path.join(tempDir, `meme_sticker_${Date.now()}.webp`)
    await execPromise(`ffmpeg -i "${outputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -lossless 1 "${webpPath}"`)

    // Kirim sticker
    const stickerBuffer = fs.readFileSync(webpPath)
    await conn.sendMessage(m.chat, {
      sticker: stickerBuffer
    }, { quoted: m })

    // Bersihkan file temp
    try {
      fs.unlinkSync(inputPath)
      fs.unlinkSync(outputPath)
      fs.unlinkSync(webpPath)
    } catch {}

  } catch (err) {
    console.error("StickerMeme Error:", err)
    
    // Fallback: kirim sebagai gambar biasa dengan caption
    try {
      const buffer = await quoted.download()
      await conn.sendMessage(m.chat, {
        image: buffer,
        caption: `*${topText.toUpperCase()}*\n\n*${bottomText.toUpperCase()}*`
      }, { quoted: m })
    } catch {
      conn.sendMessage(m.chat, {
        text: "❌ Gagal membuat meme sticker!\n\nPastikan ImageMagick terinstall."
      }, { quoted: q('fkontak') })
    }
  }
}

handler.help = ['stickermeme', 'smeme', 'memesticker']
handler.tags = ['stickermenu']
handler.command = ["stickermeme", "smeme", "memesticker"]

module.exports = handler
